import { useState } from "react"
import { Card, CardContent } from "../components/ui/card"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { ArrowLeft } from "lucide-react"

type Message = {
  sender: "user" | "bot"
  text: string
}

export default function ChatBot({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { sender: "bot", text: "Olá 👋 Sou seu assistente Unimed. Como posso ajudar?" }
  ])
  const [input, setInput] = useState("")

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

  return (
    // ⬇️ agora ocupa só o espaço disponível, sem overlay
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
        <span className="text-xs text-gray-500">Beta</span>
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
      <div className="border-t p-3 flex gap-2 bg-white rounded-b-2xl">
        <Input
          placeholder="Digite sua mensagem..."
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            setInput(e.target.value)
          }
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <Button
          onClick={handleSend}
          className="bg-green-600 hover:bg-green-700"
        >
          Enviar
        </Button>
      </div>
    </div>
  )
}
