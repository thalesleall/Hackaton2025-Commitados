import { Router } from "express";
import auth from "./routes/auth.routes";
import chatRouter from "./routes/chat.routes";

const router = Router();

// Rotas de autenticação
router.use("/auth", auth);
router.use('/chat', chatRouter);

export default router;
