import { useEffect, useState, useRef } from "react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { ArrowLeft, Paperclip } from "lucide-react"
import { useNavigate } from "react-router-dom"
// src/components/chatbot.tsx
import { useEffect, useState } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { ArrowLeft, Paperclip } from "lucide-react"
import {
  CriarConversa,
  EnviarMensagem,
  BuscarConversaPorId,
} from "../service/api"

type Message = {
  sender: "user" | "bot"
  text: string
}

type Props = {
  conversationId: string | null
  onClose: () => void
}

export default function ChatBot({ conversationId, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = "10" // localStorage.getItem("authToken")
    const userId = "10" // localStorage.getItem("idUser")
    return
    if (token || userId) {
      navigate("/login")
      return
    }
  }, [])

  const handleSend = () => {
    if (!input.trim()) return
  const [localConversationId, setLocalConversationId] = useState<string | null>(
    conversationId
  )
  const userId = localStorage.getItem("idUser") || "anon"
  const [showUpload, setShowUpload] = useState(false)

  // Criar conversa automaticamente se não existir
  useEffect(() => {
    const initConversation = async () => {
      if (localConversationId) {
        // já temos uma conversa -> carrega mensagens
        try {
          const msgs = await BuscarConversaPorId(localConversationId)
          setMessages(msgs)
        } catch (err) {
          console.error("Erro ao carregar conversa:", err)
        }
        return
      }

      // criar conversa nova
      try {
        const res = await CriarConversa(userId)
        setLocalConversationId(res.id) // 🔹 garante que pega sempre `id`

        setMessages([
          {
            sender: "bot",
            text: "Olá 👋 Sou seu assistente Unimed. Como posso ajudar?",
          },
        ])
      } catch (err) {
        console.error("Erro ao criar conversa:", err)
      }
    }

    initConversation()
  }, [userId, localConversationId])

  // Enviar mensagem para o backend
  const handleSend = async () => {
    if (!input.trim() || !localConversationId) return

    try {
      // adiciona localmente
      setMessages((prev) => [...prev, { sender: "user", text: input }])

      // envia para backend
      await EnviarMensagem(localConversationId, {
        texto: input,
        origem: "user",
      })

      // simulação de resposta
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          { sender: "bot", text: "Entendi sua mensagem: " + input },
        ])
      }, 800)

      setInput("")
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      if (file.type === "application/pdf") {
        setMessages((prev) => [
          ...prev,
          { sender: "user", text: `📎 Enviou um arquivo: ${file.name}` }
        ])
      } else {
        alert("Somente arquivos PDF são permitidos.")
      }
    }
  }

  return (
    <div className="flex flex-col w-full h-full bg-white rounded-2xl shadow-sm">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-4 py-3 border-b shadow-sm bg-white rounded-t-2xl">
        <div className="flex items-center gap-2">
          <ArrowLeft
            className="cursor-pointer text-green-700"
            size={20}
            onClick={onClose}
          />
          <h2 className="font-semibold text-green-700">
            {localConversationId ? "Conversa" : "Nova Conversa"}
          </h2>
        </div>
      </div>

      {/* Histórico */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 bg-gray-50 rounded-b-2xl">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`p-3 rounded-2xl max-w-[75%] text-sm ${
              msg.sender === "user"
                ? "bg-green-600 text-white self-end"
                : "bg-white border border-gray-200 shadow-sm self-start"
            }`}
          >
            {msg.text}
          </div>
        ))}
      </div>

      {/* Input fixo no rodapé */}
      <div className="border-t p-3 flex gap-2 bg-white rounded-b-2xl items-center">
      {/* Input */}
      <div className="border-t p-3 flex gap-2 items-center bg-white rounded-b-2xl relative">
        <button
          className="p-2 rounded-full hover:bg-green-50 border border-green-600"
          onClick={() => setShowUpload(!showUpload)}
        >
          <Paperclip className="text-green-600 w-5 h-5" />
        </button>

        {showUpload && (
          <div className="absolute bottom-14 left-3 bg-white border shadow-md rounded-lg p-3">
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) {
                  console.log("PDF selecionado:", file.name)
                }
              }}
            />
          </div>
        )}

        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />

        {/* Botão de anexar arquivo */}
        <Button
          variant="outline"
          className="border-green-600 text-green-700"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-5 h-5" />
        </Button>
        <input
          type="file"
          accept="application/pdf"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileSelect}
        />

        {/* Botão de enviar */}
        <Button
          onClick={handleSend}
          className="bg-green-600 hover:bg-green-700 text-white"
        >
          Enviar
        </Button>
      </div>
    </div>
  )
}
