import { Router } from "express";
import auth from "./routes/auth.routes";
import chatRouter from "./routes/chat.routes";
import { consultasRoutes } from "./routes/consultas.routes";

const router = Router();

// Rotas de autenticação
router.use("/auth", auth);
router.use('/chat', chatRouter);
router.use('/consultas', consultasRoutes);

export default router;
