import { useState } from "react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Home, User, Settings } from "lucide-react"
import ChatBot from "../components/chatbot"
import { Dropdown } from "../components/DropDown"

export default function Central() {
  const [search, setSearch] = useState("")
  const [showChat, setShowChat] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [activeChat, setActiveChat] = useState<number | null>(null)

  // Acessibilidade
  const [isLargeFont, setIsLargeFont] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)

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
    <div
      className={`min-h-screen flex flex-col ${
        isHighContrast ? "bg-black text-white" : "bg-[#f7fdf9] text-black"
      } ${isLargeFont ? "text-lg" : "text-base"}`}
    >
      {/* Barra Superior */}
      <header className="flex justify-between items-center px-6 py-3 bg-white shadow-sm border-b border-green-200 relative">
        <img src="/logo.png" alt="Unimed logo" className="h-8" />
        <div className="flex gap-6 items-center relative">
          {/* Ícone Home */}
          <Home
            className="text-green-700 cursor-pointer"
            onClick={() => {
              setShowChat(false)
              setActiveChat(null)
            }}
          />

          {/* Ícone Perfil */}
          <div className="relative">
            <User
              className="text-green-700 cursor-pointer"
              onClick={() => {
                setShowProfile(!showProfile)
                setShowAccessibility(false)
              }}
            />
            <Dropdown open={showProfile} onClose={() => setShowProfile(false)}>
              <ul className="flex flex-col gap-2">
                <li className="cursor-pointer hover:text-green-700">Meu Perfil</li>
                <li className="cursor-pointer hover:text-green-700">Configurações da Conta</li>
                <li className="cursor-pointer text-red-600 hover:text-red-700">Sair</li>
              </ul>
            </Dropdown>
          </div>

          {/* Ícone Acessibilidade */}
          <div className="relative">
            <Settings
              className="text-green-700 cursor-pointer"
              onClick={() => {
                setShowAccessibility(!showAccessibility)
                setShowProfile(false)
              }}
            />
            <Dropdown open={showAccessibility} onClose={() => setShowAccessibility(false)}>
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="border-green-600 text-green-700"
                  onClick={() => setIsLargeFont(!isLargeFont)}
                >
                  {isLargeFont ? "Diminuir Fonte" : "Aumentar Fonte"}
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-700"
                  onClick={() => setIsHighContrast(!isHighContrast)}
                >
                  {isHighContrast ? "Desativar Alto Contraste" : "Ativar Alto Contraste"}
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-700"
                  onClick={() => alert("Leitor de Tela ativado (simulação)")}
                >
                  Ativar Leitor de Tela
                </Button>
              </div>
            </Dropdown>
          </div>
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

        {/* Área principal */}
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

              <div className="flex justify-center mt-6">
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
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
