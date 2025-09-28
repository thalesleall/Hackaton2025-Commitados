import multer from 'multer'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    const id = crypto.randomBytes(8).toString('hex')
    const ext = path.extname(file.originalname || '.pdf') || '.pdf'
    cb(null, `upload-${id}${ext}`)
  },
})

export const uploadPdf = multer({
  storage,
  limits: { fileSize: 40 * 1024 * 1024 }, // 40MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || file.originalname?.toLowerCase().endsWith('.pdf')) {
      return cb(null, true)
    }
    cb(new Error('Arquivo inválido: envie um PDF'))
  },
}).single('file')
