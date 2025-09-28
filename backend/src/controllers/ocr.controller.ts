import type { Request, Response, NextFunction } from 'express'
import { extractTextFromPdf } from '../services/ocr.service'
import { searchProcedimentoTop } from '../services/sortingAlgorithm'

export async function ocrPdfController(req: Request, res: Response, next: NextFunction) {
  try {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file?.path) {
      return res.status(400).json({ error: 'Envie um arquivo PDF no campo "file"' })
    }

    const lang = typeof req.query.lang === 'string' ? req.query.lang : undefined
    const dpi = req.query.dpi ? Number(req.query.dpi) : undefined

    const result = await extractTextFromPdf(file.path, { lang, dpi })

    const response = await  searchProcedimentoTop(result.text.split('\n'))
    return res.json(response)
  } catch (err) {
    next(err)
  }
}
