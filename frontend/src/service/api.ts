import axios from 'axios';
import { api } from '../utils';

const API_BASE = "http://localhost:3000/api/chat"; // ajuste se a porta for outra

export interface Message {
  sender: "user" | "bot";
  text: string;
}

export interface Conversation {
  id: string;
  titulo: string;
  total_messages: number;
  last_updated: string;
}

export const loginUsuario = async (email: string, senha: string) => {
  const res = await api.post("/auth/login", { email, senha });
  return res.data; // geralmente retorna token e dados do usuário
};

export const 