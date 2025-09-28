// src/lib/ocr.ts
import { createWorker } from "tesseract.js";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.min.mjs";

// Necessário para o worker do pdfjs
// @ts-ignore
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export type OcrResult = {
  text: string;
  dict: Record<string, string>;
  pages: number;
};

async function extractPdfNativeText(file: File): Promise<{ text: string; pages: number }> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((it: any) => it.str).filter(Boolean);
    fullText += strings.join(" ") + "\n";
  }
  return { text: fullText.trim(), pages: pdf.numPages };
}

async function rasterizeAndOcr(file: File, lang = "por"): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const worker = await createWorker(lang); // 'por' ou 'eng' conforme necessidade
  let ocrText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // qualidade melhor
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    await page.render({ canvasContext: ctx, viewport }).promise;

    const { data } = await worker.recognize(canvas);
    ocrText += (data.text || "") + "\n";
  }

  await worker.terminate();
  return ocrText.trim();
}

function toDict(text: string): Record<string, string> {
  const dict: Record<string, string> = {};
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Heurística simples "chave: valor"
    const m = line.match(/^([^:]{2,30}):\s*(.+)$/);
    if (m) {
      const key = m[1].toLowerCase().replace(/\s+/g, "_");
      dict[key] = m[2];
    }
  }

  // Caso não tenha chaves claras, devolve raw_text
  if (Object.keys(dict).length === 0) {
    dict["raw_text"] = text;
  }
  return dict;
}

export async function pdfToTextOrOcr(file: File, minNativeLen = 80): Promise<OcrResult> {
  // 1) Tenta texto nativo
  const native = await extractPdfNativeText(file);
  let text = native.text;

  // 2) Se pouco texto, tenta OCR
  if (!text || text.length < minNativeLen) {
    text = await rasterizeAndOcr(file, "por"); // mude p/ "eng" se necessário
  }

  const dict = toDict(text);
  return { text, dict, pages: native.pages };
}
