import { Router } from "express";
import auth from "./routes/auth.routes";

const router = Router();

// Rotas de autenticação
router.use("/auth", auth);

// Aqui você pode adicionar mais grupos de rotas futuramente:
// router.use("/users", userRoutes);
// router.use("/products", productRoutes);

export default router;
