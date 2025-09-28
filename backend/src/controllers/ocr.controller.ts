import type { Request, Response, NextFunction } from 'express'
import { extractTextFromPdf } from '../services/ocr.service'

export async function ocrPdfController(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file?.path) {
      return res.status(400).json({ error: 'Envie um arquivo PDF no campo "file"' })
    }

    const lang = typeof req.query.lang === 'string' ? req.query.lang : undefined
    const dpi = req.query.dpi ? Number(req.query.dpi) : undefined

    const result = await extractTextFromPdf(file.path, { lang, dpi })
    return res.json(result)
  } catch (err) {
    next(err)
  }
}
