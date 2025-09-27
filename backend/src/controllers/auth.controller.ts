import { Request, Response } from "express";
import { loginService } from "../services/auth.services";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: "Email e senha obrigatórios" });

    const data = await loginService(email, password);

    return res.status(200).json({
      message: "Login realizado com sucesso",
      user: data.user,
      session: data.session,
    });
  } catch (err: any) {
    return res.status(401).json({ error: err.message });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    return res.status(200).json({ message: "Usuário autenticado", user });
  } catch {
    return res.status(500).json({ error: "Erro ao buscar perfil" });
  }
};
