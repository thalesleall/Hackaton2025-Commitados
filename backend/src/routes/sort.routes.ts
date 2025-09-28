import { Router } from "express";
import { login, getProfile } from "../controllers/auth.controller";

const auth = Router();

//auth.post("/sort", {});

// rota protegida por token
//auth.post("/sort", {});

export default auth;
