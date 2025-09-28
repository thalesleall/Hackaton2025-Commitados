// src/services/ocr.service.ts
import fs from 'node:fs/promises'
import { fromPath as pdfToPicFromPath } from 'pdf2pic'
// @ts-ignore (pdf-parse é CJS)
import pdfParse from 'pdf-parse'
import Tesseract from 'tesseract.js'

export type OcrResult = {
  text: string
  source: 'embedded' | 'ocr'
  pageCount: number
  ocrPages: number
  elapsedMs: number
}

function normalizeLang(lang?: string) {
  // padrão: português + inglês
  return (lang && lang.trim()) || 'por+eng'
}

export async function extractTextFromPdf(
  pdfPath: string,
  opts?: { lang?: string; dpi?: number }
): Promise<OcrResult> {
  const started = Date.now()
  const lang = normalizeLang(opts?.lang)
  const dpi = opts?.dpi ?? 200

  // 1) Tenta texto embutido (mais rápido e preciso)
  try {
    const buf = await fs.readFile(pdfPath)
    const data = await pdfParse(buf)
    const embeddedText = (data.text || '').replace(/\r/g, '')
    const trimmed = embeddedText.trim()
    if (trimmed.length >= 20) {
      return {
        text: trimmed,
        source: 'embedded',
        pageCount: data.numpages || 0,
        ocrPages: 0,
        elapsedMs: Date.now() - started,
      }
    }
  } catch {
    // ignora e cai no OCR
  }

  // 2) OCR: converte páginas em buffers de imagem e processa no Tesseract
  const converter = pdfToPicFromPath(pdfPath, {
    density: dpi,
    format: 'png',
    quality: 100,
  })

  // ⚠️ 2º argumento agora é um OBJETO. Nada de 'false'.
  // Vamos pedir as páginas como BUFFER para passar direto ao Tesseract.
  let pages: Array<{ page: number; buffer: Buffer }> = []
  try {
    const res: any[] = await converter.bulk(-1, { responseType: 'buffer' })
    pages = (res || [])
      .map((r: any) => ({ page: Number(r.page), buffer: r.buffer as Buffer }))
      .filter(p => p.buffer instanceof Buffer)
      .sort((a, b) => a.page - b.page)
  } catch (e: any) {
    throw new Error(
      `Falha ao converter PDF para imagens. Verifique Ghostscript/GraphicsMagick. Detalhe: ${
        e?.message || e
      }`
    )
  }

  if (!pages.length) {
    throw new Error('Nenhuma página foi gerada para OCR.')
  }

  let ocrText = ''
  for (const p of pages) {
    const result = await Tesseract.recognize(p.buffer, lang)
    const pageText = (result?.data?.text || '').replace(/\r/g, '').trim()
    ocrText += `\n\n===== Página ${p.page} =====\n${pageText}\n`
  }

  return {
    text: ocrText.trim(),
    source: 'ocr',
    pageCount: pages.length,
    ocrPages: pages.length,
    elapsedMs: Date.now() - started,
  }
}
