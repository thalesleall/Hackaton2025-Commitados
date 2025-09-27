import { Router } from "express";
import auth from "./routes/auth.routes";

const router = Router();

// Rotas de autenticação
router.use("/auth", auth);
router.use("", )

export default router;
