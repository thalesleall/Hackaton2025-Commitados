// src/service/api.ts
import { api } from "../utils"

/** Normaliza o ID da conversa vindo do backend */
function normalizeConversationId(resp: any): string | null {
  return (
    resp?.id ??
    resp?.id_conversa ??
    resp?.conversationId ??
    resp?.data?.id ??
    resp?.data?.id_conversa ??
    null
  )
}



/** Login de usuário */
/** Login de usuário */
export async function LoginUsuario(payload: { email: string; senha: string }) {
  const res = await api.post("/api/auth/login", {
    email: payload.email,
    password: payload.senha, // 👈 mapeia corretamente
  })
  return res.data
}

/** Criar uma nova conversa para o usuário */
export async function CriarConversa(userId: string): Promise<{ id: string }> {
  const res = await api.post(`/api/chat/conversations/${userId}`)
  const id = normalizeConversationId(res.data)
  if (!id) {
    console.error("⚠️ Resposta ao criar conversa não contém ID:", res.data)
    throw new Error("Conversa sem ID")
  }
  return { id }
}

/** Carregar todas conversas de um usuário */
export async function CarregarConversas(userId: string) {
  const res = await api.get(`/api/chat/conversations/${userId}`)
  return res.data
}

/** Buscar conversa específica por ID (retorna mensagens normalizadas) */
export async function BuscarConversaPorId(conversationId: string): Promise<
  Array<{ sender: "user" | "bot"; text: string }>
> {
  const res = await api.get(`/api/chat/${conversationId}`)

  // Normalização das mensagens vindas do backend
  const raw =
    res.data?.mensagens ??
    res.data?.messages ??
    (Array.isArray(res.data) ? res.data : [])

  const msgs: Array<{ sender: "user" | "bot"; text: string }> = raw.map(
    (m: any) => ({
      sender: m?.origem === "user" ? "user" : "bot",
      text: m?.texto ?? m?.text ?? "",
    })
  )

  return msgs
}

/** Enviar mensagem dentro de uma conversa */
export async function EnviarMensagem(
  conversationId: string,
  payload: { texto: string; origem: "user" | "bot" }
) {
  const res = await api.post(`/api/chat/${conversationId}/mensagens`, payload)
  return res.data
}

/** Enviar documento parseado via OCR */
export async function enviarDocumentoParseado(payload: {
  text: string
  dict: Record<string, string>
  pages: number
  filename: string
}) {
  const res = await api.post("/api/ocr/ingest", payload)
  return res.data
}
