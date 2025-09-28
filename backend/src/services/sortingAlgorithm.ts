import 'dotenv/config'
import dns from 'node:dns'
import { lookup as dnsLookup } from 'node:dns/promises'
dns.setDefaultResultOrder('ipv4first') // prioriza IPv4

import { Pool, type PoolClient } from 'pg'

// =========================
// Config/Tabela
// =========================
const TABLE_NAME = process.env.TABLE_NAME || 'public.rol_procedimentos'

// =========================
// Pool (lazy) com resolução IPv4
// =========================
export type PgCfg = { host: string; port: number; database: string; user: string; password: string }

function safeParseDbUrl(urlStr?: string): Partial<PgCfg> {
  if (!urlStr) return {}
  try {
    const u = new URL(urlStr)
    return {
      host: u.hostname,
      port: Number(u.port || 5432),
      database: (u.pathname || '/postgres').replace(/^\//, '') || 'postgres',
      user: decodeURIComponent(u.username || 'postgres'),
      password: decodeURIComponent(u.password || ''),
    }
  } catch {
    return {}
  }
}

function deriveProjectRefFromUrl(urlStr?: string): string | null {
  if (!urlStr) return null
  try {
    const host = new URL(urlStr).hostname // "<ref>.supabase.co"
    const ref = host.split('.')[0]
    return ref || null
  } catch {
    return null
  }
}

async function buildPgConfig(): Promise<PgCfg> {
  const parsed = safeParseDbUrl(process.env.DATABASE_URL)

  let host = process.env.PGHOST || parsed.host
  if (!host) {
    const ref = deriveProjectRefFromUrl(process.env.SUPABASE_URL)
    if (!ref) throw new Error('PGHOST ausente e não foi possível derivar do SUPABASE_URL/DATABASE_URL')
    host = `db.${ref}.supabase.co`
  }

  const port = Number(process.env.PGPORT || parsed.port || 5432)
  const database = process.env.PGDATABASE || parsed.database || 'postgres'
  const user = process.env.PGUSER || parsed.user || 'postgres'
  const password = process.env.PGPASSWORD ?? parsed.password ?? ''

  if (!password) {
    throw new Error(
      'PGPASSWORD ausente. Defina PGPASSWORD no .env (recomendado) ou use DATABASE_URL com senha codificada.'
    )
  }

  // Resolve host para IPv4 para evitar quedas em ambientes sem IPv6
  const { address: hostV4 } = await dnsLookup(host, { family: 4 })

  return { host: hostV4, port, database, user, password }
}

let poolPromise: Promise<Pool> | null = null
export async function getPool(): Promise<Pool> {
  if (!poolPromise) {
    poolPromise = (async () => {
      const cfg = await buildPgConfig()
      return new Pool({
        host: cfg.host,
        port: cfg.port,
        database: cfg.database,
        user: cfg.user,
        password: cfg.password,
        ssl: { rejectUnauthorized: false }, // Supabase exige SSL
        keepAlive: true,
        connectionTimeoutMillis: 15000,
        idleTimeoutMillis: 30000,
        max: 10,
      })
    })()
  }
  return poolPromise
}

async function ensureExtensions(client: PoolClient) {
  try {
    await client.query(`create extension if not exists pg_trgm;`)
    await client.query(`create extension if not exists unaccent;`)
  } catch {
    // ok falhar sem permissão: a busca ainda funciona, só pode ficar menos eficiente
  }
}

// =========================
// Tipos
// =========================
export type Hit = {
  codigo: string
  coluna: 'procedimento' | 'terminologia_tab22' | 'subgrupo' | 'grupo' | 'capitulo'
  valor: string
  score: number
  procedimento: string | null
  terminologia_tab22: string | null
  subgrupo: string | null
  grupo: string | null
  capitulo: string | null
  auditoria: string | null // ::text no SELECT
}

export type TopHit = {
  valor: string
  score: number
  auditoria: string | null
}

// =========================
// Busca - lista completa (mantida recebendo string única)
// =========================
export async function searchProcedimentos(phrase: string, limit = 20): Promise<Hit[]> {
  const q = phrase?.trim()
  if (!q) return []

  const pool = await getPool()
  const client = await pool.connect()
  try {
    await ensureExtensions(client)

    const { rows } = await client.query<Hit>(
      `
      with norm as (
        select unaccent(lower($1)) as qn,
               websearch_to_tsquery('portuguese', $1) as tsq
      ),
      base as (
        select
          p.codigo,
          p.procedimento,
          p.terminologia_tab22,
          p.subgrupo,
          p.grupo,
          p.capitulo,
          (p.auditoria)::text as auditoria,
          setweight(to_tsvector('portuguese', coalesce(p.procedimento, '')), 'A') ||
          setweight(to_tsvector('portuguese', coalesce(p.terminologia_tab22, '')), 'A') ||
          setweight(to_tsvector('portuguese', coalesce(p.subgrupo, '')), 'B') ||
          setweight(to_tsvector('portuguese', coalesce(p.grupo, '')), 'C') ||
          setweight(to_tsvector('portuguese', coalesce(p.capitulo, '')), 'D')
          as tsv
        from ${TABLE_NAME} p
      ),
      scores as (
        -- procedimento
        select
          b.codigo,
          'procedimento'::text as coluna,
          b.procedimento as valor,
          greatest(
            similarity(unaccent(lower(b.procedimento)), (select qn from norm)),
            0.2 * ts_rank(b.tsv, (select tsq from norm))
          ) as score,
          b.procedimento,
          b.terminologia_tab22,
          b.subgrupo,
          b.grupo,
          b.capitulo,
          b.auditoria
        from base b
        where b.procedimento is not null
          and (
            unaccent(lower(b.procedimento)) % (select qn from norm)
            or b.tsv @@ (select tsq from norm)
          )

        union all

        -- terminologia_tab22
        select
          b.codigo,
          'terminologia_tab22',
          b.terminologia_tab22 as valor,
          greatest(
            similarity(unaccent(lower(b.terminologia_tab22)), (select qn from norm)),
            0.2 * ts_rank(b.tsv, (select tsq from norm))
          ) as score,
          b.procedimento, b.terminologia_tab22, b.subgrupo, b.grupo, b.capitulo, b.auditoria
        from base b
        where b.terminologia_tab22 is not null
          and (
            unaccent(lower(b.terminologia_tab22)) % (select qn from norm)
            or b.tsv @@ (select tsq from norm)
          )

        union all

        -- subgrupo
        select
          b.codigo,
          'subgrupo',
          b.subgrupo as valor,
          similarity(unaccent(lower(b.subgrupo)), (select qn from norm)) as score,
          b.procedimento, b.terminologia_tab22, b.subgrupo, b.grupo, b.capitulo, b.auditoria
        from base b
        where b.subgrupo is not null
          and unaccent(lower(b.subgrupo)) % (select qn from norm)

        union all

        -- grupo
        select
          b.codigo,
          'grupo',
          b.grupo as valor,
          similarity(unaccent(lower(b.grupo)), (select qn from norm)) as score,
          b.procedimento, b.terminologia_tab22, b.subgrupo, b.grupo, b.capitulo, b.auditoria
        from base b
        where b.grupo is not null
          and unaccent(lower(b.grupo)) % (select qn from norm)

        union all

        -- capitulo
        select
          b.codigo,
          'capitulo',
          b.capitulo as valor,
          similarity(unaccent(lower(b.capitulo)), (select qn from norm)) as score,
          b.procedimento, b.terminologia_tab22, b.subgrupo, b.grupo, b.capitulo, b.auditoria
        from base b
        where b.capitulo is not null
          and unaccent(lower(b.capitulo)) % (select qn from norm)
      )
      select *
      from scores
      where valor is not null and nullif(trim(valor), '') is not null
      order by score desc, coluna asc
      limit $2;
      `,
      [q, limit]
    )

    return rows
  } finally {
    client.release()
  }
}

// =========================
// Busca - TOP 1 (AGORA aceita string | string[] e retorna o MAIOR score entre TODAS as frases)
// =========================
export async function searchProcedimentoTop(phrases: string | string[]): Promise<TopHit | null> {
  const arr = (Array.isArray(phrases) ? phrases : [phrases])
    .map((s) => s?.trim())
    .filter((s): s is string => !!s && s.length > 0)

  if (arr.length === 0) return null

  const pool = await getPool()
  const client = await pool.connect()
  try {
    await ensureExtensions(client)

    const { rows } = await client.query<TopHit>(
      `
      with norm as (
        -- Normaliza todas as frases fornecidas
        select q as phrase,
               unaccent(lower(q)) as qn,
               websearch_to_tsquery('portuguese', q) as tsq
        from unnest($1::text[]) as q
      ),
      base as (
        select
          p.codigo,
          p.procedimento,
          p.terminologia_tab22,
          p.subgrupo,
          p.grupo,
          p.capitulo,
          (p.auditoria)::text as auditoria,
          setweight(to_tsvector('portuguese', coalesce(p.procedimento, '')), 'A') ||
          setweight(to_tsvector('portuguese', coalesce(p.terminologia_tab22, '')), 'A') ||
          setweight(to_tsvector('portuguese', coalesce(p.subgrupo, '')), 'B') ||
          setweight(to_tsvector('portuguese', coalesce(p.grupo, '')), 'C') ||
          setweight(to_tsvector('portuguese', coalesce(p.capitulo, '')), 'D')
          as tsv
        from ${TABLE_NAME} p
      ),
      scores as (
        -- procedimento (para cada frase candidata)
        select
          b.procedimento as valor,
          greatest(
            similarity(unaccent(lower(b.procedimento)), n.qn),
            0.2 * ts_rank(b.tsv, n.tsq)
          ) as score,
          b.auditoria
        from base b
        cross join norm n
        where b.procedimento is not null
          and (
            unaccent(lower(b.procedimento)) % n.qn
            or b.tsv @@ n.tsq
          )
        union all
        -- terminologia_tab22
        select
          b.terminologia_tab22 as valor,
          greatest(
            similarity(unaccent(lower(b.terminologia_tab22)), n.qn),
            0.2 * ts_rank(b.tsv, n.tsq)
          ) as score,
          b.auditoria
        from base b
        cross join norm n
        where b.terminologia_tab22 is not null
          and (
            unaccent(lower(b.terminologia_tab22)) % n.qn
            or b.tsv @@ n.tsq
          )
        union all
        -- subgrupo
        select
          b.subgrupo as valor,
          similarity(unaccent(lower(b.subgrupo)), n.qn) as score,
          b.auditoria
        from base b
        cross join norm n
        where b.subgrupo is not null
          and unaccent(lower(b.subgrupo)) % n.qn
        union all
        -- grupo
        select
          b.grupo as valor,
          similarity(unaccent(lower(b.grupo)), n.qn) as score,
          b.auditoria
        from base b
        cross join norm n
        where b.grupo is not null
          and unaccent(lower(b.grupo)) % n.qn
        union all
        -- capitulo
        select
          b.capitulo as valor,
          similarity(unaccent(lower(b.capitulo)), n.qn) as score,
          b.auditoria
        from base b
        cross join norm n
        where b.capitulo is not null
          and unaccent(lower(b.capitulo)) % n.qn
      )
      select valor, score, auditoria
      from scores
      where valor is not null and nullif(trim(valor), '') is not null
      order by score desc
      limit 1;
      `,
      [arr]
    )

    return rows[0] ?? null
  } finally {
    client.release()
  }
}

export async function closePool() {
  const p = await getPool()
  await p.end()
}

/*
USO RÁPIDO:

// Top 1 para UMA frase (mantido)
await searchProcedimentoTop('ressonância magnética joelho')

// Top 1 entre VÁRIAS frases (NOVIDADE)
await searchProcedimentoTop([
  'ressonancia do joelho',
  'RM genicular',
  'ressonância magnética do joelho sem contraste'
])

*/
