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

export const loginUsuario = async (email: string, password: string) => {
  const res = await api.post("/api/auth/login", { email, password });
  return res.data; // geralmente retorna token e dados do usuário
};

export const getProfile = async () => {
  const res = await api.get("/api/auth/profile");
  return res.data;
};

export const sendMessage = async (id_usuario: string, message: { text: string }) => {
  const res = await api.post("/api/chat/message", { id_usuario, message: message.text });
  return res.data;
};

export const sendMessageSimple = async (message: string) => {
  const res = await api.post("/api/chat/message-simple", { message });
  return res.data;
};

export const getConversation = async (conversationId: string) => {
  const res = await api.get(`/api/chat/conversation/${conversationId}`);
  return res.data;
};

export const getConversations = async (userId: string) => {
  const res = await api.get(`/api/chat/conversations/${userId}`);
  return res.data?.conversations || [];
};

export const extractTextFromPDF = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post("/api/ocr/extract-text", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const uploadAutorizacaoExame = async (file: File, lang?: string, dpi?: number) => {
  const formData = new FormData();
  formData.append('file', file);
  if (lang) formData.append('lang', lang);
  if (dpi) formData.append('dpi', dpi.toString());
  
  const res = await api.post("/api/chat/upload-autorizacao", formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
};

export const CarregarConversas = async (userId: string) => {
  return await getConversations(userId);
};

export const closeActiveConversations = async (userId: string) => {
  const res = await api.post("/api/chat/close-active-conversations", { id_usuario: userId });
  return res.data;
};

export const createNewConversation = async (userId: string) => {
  const res = await api.post("/api/chat/nova-conversa", { id_usuario: userId });
  return res.data;
};

export const CriarConversa = async (userId: string) => {
  // Criar uma nova conversa (pode usar sendMessageSimple para iniciar)
  const res = await sendMessageSimple("Nova conversa iniciada");
  return res;
};

 