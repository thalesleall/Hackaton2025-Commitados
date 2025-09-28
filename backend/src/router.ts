import { Router } from "express";
import auth from "./routes/auth.routes";
import chatRouter from "./routes/chat.routes";
import ocrRouter from "./routes/ocr.routes";

const router = Router();

// Rotas de autenticação
router.use("/auth", auth);

router.use('/chat', chatRouter);
router.use("/ocr", ocrRouter);

export default router;