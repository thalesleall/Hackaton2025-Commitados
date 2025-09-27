import { useState } from "react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Home, User, MessageCircle, Settings } from "lucide-react"
import ChatBot from "../components/chatbot"

export default function Central() {
  const [search, setSearch] = useState("")
  const [showChat, setShowChat] = useState(false)

  const chats = [
    {
      id: 1,
      nome: "Maria Souza",
      protocolo: "#48291",
      canal: "WhatsApp",
      status: "Última mensagem há 2min",
      msg: "Olá, gostaria de confirmar a cobertura do meu plano para exame de sangue..."
    },
    {
      id: 2,
      nome: "João Pereira",
      protocolo: "#48276",
      canal: "Chat Web",
      status: "Última mensagem há 5min",
      msg: "Enviei os documentos e preciso do termo de seguro para assinatura."
    },
    {
      id: 3,
      nome: "Ana Lima",
      protocolo: "#48270",
      canal: "Telefone",
      status: "Aguardando seu retorno",
      msg: "Cliente parou de responder. Reagendar contato manualmente."
    },
  ]

  const filteredChats = chats.filter(c =>
    c.nome.toLowerCase().includes(search.toLowerCase()) ||
    c.protocolo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-[#f7fdf9] flex flex-col">
      
      {/* Barra Superior */}
      <header className="flex justify-between items-center px-6 py-3 bg-white shadow-sm border-b border-green-200">
        <img src="/logo.png" alt="Unimed logo" className="h-8" />
        <div className="flex gap-4">
          <Home className="text-green-700 cursor-pointer" />
          <MessageCircle className="text-green-700 cursor-pointer" />
          <User className="text-green-700 cursor-pointer" />
          <Settings className="text-green-700 cursor-pointer" />
        </div>
      </header>

      <main className="flex flex-1 p-6 gap-6">
        
        {/* Sidebar - Ações rápidas */}
        <aside className="w-64 bg-white shadow-sm rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-lg">Ações rápidas</h2>
          <Button className="bg-green-600 hover:bg-green-700 text-white w-full">Encerrar atendimento</Button>
          <Button variant="outline" className="border-green-600 text-green-700 w-full">Fazer manualmente</Button>
          <Button variant="outline" className="border-green-600 text-green-700 w-full">Termo seguro</Button>
          <p className="text-xs text-gray-500 mt-2">
            Use as ações para finalizar, assumir manualmente ou enviar o termo.
          </p>
        </aside>

        {/* Área principal (ou mostra lista de conversas, ou o ChatBot) */}
        <section className="flex-1 flex flex-col gap-4">
          {!showChat ? (
            <>
              <Input
                placeholder="Buscar conversa por nome, telefone ou protocolo..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
                className="border-green-500"
              />

              {filteredChats.map((chat) => (
                <Card key={chat.id} className="hover:shadow-md transition">
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-1">
                      <p className="font-semibold">
                        {chat.nome} • Protocolo {chat.protocolo}
                      </p>
                      <span className="text-sm text-gray-500">
                        {chat.canal} • {chat.status}
                      </span>
                      <p className="text-sm text-gray-700 mt-1">{chat.msg}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}

              <div className="flex justify-center mt-6">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => setShowChat(true)}
                >
                  Iniciar nova conversa
                </Button>
              </div>
            </>
          ) : (
            <ChatBot onClose={() => setShowChat(false)} />
          )}
        </section>
      </main>

      {/* Rodapé */}
      <footer className="text-center py-3 text-xs text-gray-500 border-t border-green-200">
        © Projeto Hackathon — layout base no estilo Verde Unimed
      </footer>
    </div>
  )
}
