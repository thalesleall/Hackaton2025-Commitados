// src/utils.ts
import axios from "axios"

// Cria uma instância do Axios configurada
export const api = axios.create({
  baseURL: "http://localhost:3000", // ajuste para a URL do seu backend
  headers: {
    "Content-Type": "application/json",
  },
})

// Interceptor opcional para enviar token automaticamente
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken")
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
