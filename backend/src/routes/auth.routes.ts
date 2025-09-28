import { Router } from "express";
import { login, getProfile } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";

const auth = Router();

auth.post("/login", login);

// rota protegida por token
auth.get("/profile", authenticate, getProfile);

export default auth;
