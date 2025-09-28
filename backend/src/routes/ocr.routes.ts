// src/routes/ocr.routes.ts
import { Router } from 'express'
import { ocrPdfController } from '../controllers/ocr.controller'
import { uploadPdf } from '../middlewares/upload.middleware'

const ocrRouter = Router()

// POST /ocr (multipart/form-data, campo "file")
ocrRouter.post('/extract-text', uploadPdf, ocrPdfController)

export default ocrRouter;
