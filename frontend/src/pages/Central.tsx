import { useEffect, useState } from "react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Home, User, Settings, AlertTriangle } from "lucide-react"
import ChatBot from "../components/chatbot"
import { useNavigate } from "react-router-dom"
import { CarregarConversas } from "../service/api"

export default function Central() {
  const [search, setSearch] = useState("")
  const [showChat, setShowChat] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [activeChat, setActiveChat] = useState<number | null>(null)
  const [chats, setChats] = useState<any[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true) // <<< NOVO

  const navigate = useNavigate()

  // Acessibilidade
  const [isLargeFont, setIsLargeFont] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)



  const filteredChats = chats.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.protocolo.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isHighContrast ? "bg-black text-white" : "bg-[#f7fdf9] text-black"
      } ${isLargeFont ? "text-lg" : "text-base"}`}
    >
      {/* Barra Superior */}
      <header className="flex justify-between items-center px-6 py-3 bg-white shadow-sm border-b border-green-200 relative">
        <img src="/logo.png" alt="Unimed logo" className="h-8" />
        <div className="flex gap-6 items-center relative">
          <Home
            className="text-green-700 cursor-pointer"
            onClick={() => {
              setShowChat(false)
              setActiveChat(null)
            }}
          />
          <div className="relative">
            <User
              className="text-green-700 cursor-pointer"
              onClick={() => {
                setShowProfile(!showProfile)
                setShowAccessibility(false)
              }}
            />
          </div>
          <div className="relative">
            <Settings
              className="text-green-700 cursor-pointer"
              onClick={() => {
                setShowAccessibility(!showAccessibility)
                setShowProfile(false)
              }}
            />
          </div>
        </div>
      </header>

      <main className="flex flex-1 p-6 gap-6">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm rounded-2xl p-4 flex flex-col gap-3">
          <h2 className="font-semibold text-lg">Ações rápidas</h2>
          <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
            Encerrar atendimento
          </Button>
          <Button
            variant="outline"
            className="border-green-600 text-green-700 w-full"
          >
            Fazer manualmente
          </Button>
          <Button
            variant="outline"
            className="border-green-600 text-green-700 w-full"
          >
            Termo seguro
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Use as ações para finalizar, assumir manualmente ou enviar o termo.
          </p>
        </aside>

        {/* Área principal */}
        <section className="flex-1 flex flex-col gap-4">
          {!showChat ? (
            <>
              <Input
                placeholder="Buscar conversa por protocolo..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setSearch(e.target.value)
                }
                className="border-green-500"
              />

              {/* Loading */}
              {loading && (
                <Card className="mt-4 shadow-sm border border-green-300 bg-green-50">
                  <CardContent className="p-6 text-center text-green-700 font-medium">
                    Carregando conversas...
                  </CardContent>
                </Card>
              )}

              {/* Se houve erro ou sem mensagens */}
              {!loading && erro && (
                <Card
                  className={`mt-4 shadow-sm ${
                    erro.includes("Não foi possível")
                      ? "border-red-300 bg-red-50"
                      : "border-green-300 bg-green-50"
                  }`}
                >
                  <CardContent
                    className={`p-6 text-center font-medium ${
                      erro.includes("Não foi possível")
                        ? "text-red-600"
                        : "text-green-700"
                    }`}
                  >
                    {erro}
                  </CardContent>
                </Card>
              )}

              {!loading &&
                !erro &&
                filteredChats.map((chat) => (
                  <Card
                    key={chat.id}
                    className={`hover:shadow-md transition cursor-pointer ${
                      activeChat === chat.id ? "border-l-4 border-orange-500" : ""
                    }`}
                    onClick={() => {
                      setActiveChat(chat.id)
                      setShowChat(true)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                          <p className="font-semibold">
                            {chat.nome} • Protocolo {chat.protocolo}
                          </p>
                          {activeChat === chat.id && (
                            <span className="text-xs bg-orange-100 text-orange-600 px-2 py-1 rounded-md">
                              Em andamento
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">
                          {chat.canal} • {chat.status}
                        </span>
                        <p className="text-sm mt-1">{chat.msg}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}

              <div className="flex justify-center w-full mt-6">
                <Button
                  className="w-1/2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    setShowChat(true)
                    setActiveChat(null)
                  }}
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
