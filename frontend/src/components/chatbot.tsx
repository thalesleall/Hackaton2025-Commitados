import { useEffect, useState, useRef } from "react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { ArrowLeft, Paperclip } from "lucide-react"
import { useNavigate } from "react-router-dom"

type Message = {
  sender: "user" | "bot"
  text: string
}

export default function ChatBot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Olá 👋 Sou seu assistente Unimed. Como posso ajudar?" }
  ])
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

    setMessages((prev) => [...prev, { sender: "user", text: input }])

    // simula resposta
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: "bot", text: "Entendi sua mensagem: " + input }
      ])
    }, 1000)

    setInput("")
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
          <h2 className="font-semibold text-green-700">Nova Conversa</h2>
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
        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
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
