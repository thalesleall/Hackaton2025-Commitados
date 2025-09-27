import { Request, Response, NextFunction } from "express";
import { verifyTokenService } from "../services/auth.services";

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Token não fornecido" });

    const token = authHeader.split(" ")[1]; // "Bearer <token>"
    const user = await verifyTokenService(token);

    (req as any).user = user;
    next();
  } catch (err: any) {
    return res.status(401).json({ error: err.message || "Não autorizado" });
  }
};
