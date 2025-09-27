import { useEffect, useState } from "react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { User, Settings, MessageSquarePlus, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import ChatBot from "../components/chatbot"
import { Dropdown } from "../components/DropDown"
import { CarregarConversas, CarregarUsuario } from "../service/api"
import { useNavigate } from "react-router-dom"
import Logo from "../assets/logo.png"
import { useAccessibility } from "../components/AccessibilityContext"

export default function Central() {
  const [search, setSearch] = useState("")
  const [showChat, setShowChat] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [activeChat, setActiveChat] = useState<number | null>(null)
  const [chats, setChats] = useState<any[]>([])
  const [erro, setErro] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const navigate = useNavigate()

  // ⬇️ usa o contexto de acessibilidade em vez de estados locais
  const { isLargeFont, isHighContrast, toggleFontSize, toggleContrast } =
    useAccessibility()

  // Modal de edição de perfil
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [nome, setNome] = useState("")
  const [email, setEmail] = useState("")
  const [senha, setSenha] = useState("")
  const [cpf, setCpf] = useState("")
  const [dataNascimento, setDataNascimento] = useState("")

  useEffect(() => {
    const token = localStorage.getItem("authToken")
    const userId = localStorage.getItem("userId")
    return
    if (!token || !userId) {
      navigate("/login")
      return
    }

    const fetchUser = async () => {
      try {
        const response = await CarregarUsuario(userId)
        if (response && response.data) {
          setNome(response.data.nome || "")
          setEmail(response.data.email || "")
          setCpf(response.data.cpf || "")
          setDataNascimento(response.data.dataNascimento || "")
        }
      } catch (error) {
        console.error("Erro ao carregar usuário:", error)
      }
    }

    const fetchChats = async () => {
      try {
        const response = await CarregarConversas(userId)

        if (response && response.data && response.data.length > 0) {
          setChats(response.data)
        } else {
          setErro("Não há conversas em aberto.")
        }
      } catch (error) {
        setErro("Erro ao carregar as conversas.")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
    fetchChats()
  }, [navigate])

  const handleLogout = () => {
    localStorage.removeItem("authToken")
    localStorage.removeItem("userId")
    navigate("/login")
  }

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
        <img src={Logo} alt="Unimed logo" className="h-10" />
        <div className="flex gap-6 items-center relative">
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
                <li
                  className="cursor-pointer hover:text-green-700"
                  onClick={() => {
                    setShowProfile(false)
                    setShowProfileModal(true)
                  }}
                >
                  Configurações de Perfil
                </li>
                <li
                  className="cursor-pointer text-red-600 hover:text-red-700"
                  onClick={handleLogout}
                >
                  Sair
                </li>
              </ul>
            </Dropdown>
          </div>
          <div className="relative">
            <Settings
              className="text-green-700 cursor-pointer"
              onClick={() => {
                setShowAccessibility(!showAccessibility)
                setShowProfile(false)
              }}
            />
            <Dropdown
              open={showAccessibility}
              onClose={() => setShowAccessibility(false)}
            >
              <div className="flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="border-green-600 text-green-700"
                  onClick={toggleFontSize}
                >
                  {isLargeFont ? "Diminuir Fonte" : "Aumentar Fonte"}
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-700"
                  onClick={toggleContrast}
                >
                  {isHighContrast
                    ? "Desativar Alto Contraste"
                    : "Ativar Alto Contraste"}
                </Button>
              </div>
            </Dropdown>
          </div>
        </div>
      </header>

      <main className="flex flex-1 p-6 gap-6 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm rounded-2xl p-4 flex flex-col gap-3 self-start">
          <h2 className="font-semibold text-lg">Ações rápidas</h2>
          <Button className="bg-green-600 hover:bg-green-700 text-white w-full">
            Minhas Conversas
          </Button>
          <Button
            variant="outline"
            className="border-green-600 text-green-700 w-full"
          >
            Fazer manualmente
          </Button>
          <p className="text-xs text-gray-500 mt-2">
            Use as ações para finalizar ou assumir manualmente.
          </p>
        </aside>

        {/* Área principal */}
        <section className="flex-1 flex flex-col gap-4">
          <AnimatePresence mode="wait">
            {!showChat ? (
              <motion.div
                key="conversations"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-4 h-full"
              >
                <Input
                  placeholder="Buscar conversa protocolo..."
                  value={search}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setSearch(e.target.value)
                  }
                  className="border-green-500"
                />

                <div className="flex-1 overflow-y-auto pr-2">
                  {loading && (
                    <Card className="mt-4 shadow-sm border border-green-300 bg-green-50">
                      <CardContent className="p-6 text-center text-green-700 font-medium">
                        Carregando conversas...
                      </CardContent>
                    </Card>
                  )}

                  {!loading && erro && (
                    <Card
                      className={`mt-4 shadow-sm ${
                        erro.includes("Erro")
                          ? "border-red-300 bg-red-50"
                          : "border-green-300 bg-green-50"
                      }`}
                    >
                      <CardContent
                        className={`p-6 text-center font-medium ${
                          erro.includes("Erro")
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
                          activeChat === chat.id
                            ? "border-l-4 border-orange-500"
                            : ""
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
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.3 }}
                className="flex-1"
              >
                <ChatBot onClose={() => setShowChat(false)} />
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {!showChat && (
        <button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center shadow-lg"
          onClick={() => {
            setShowChat(true)
            setActiveChat(null)
          }}
        >
          <MessageSquarePlus className="text-white w-7 h-7" />
        </button>
      )}

      <footer className="text-center py-3 text-xs text-gray-500 border-t border-green-200">
        © Projeto Hackathon — layout base no estilo Verde Unimed
      </footer>

      {/* Modal de edição de perfil */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-red-600"
                onClick={() => setShowProfileModal(false)}
              >
                <X className="w-5 h-5" />
              </button>
              <h2 className="text-xl font-semibold mb-4 text-green-700">
                Editar Perfil
              </h2>

              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Nome"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Input
                  placeholder="Digite sua nova senha"
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
                <Input
                  placeholder="CPF"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                />
                <Input
                  type="date"
                  value={dataNascimento}
                  onChange={(e) => setDataNascimento(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <Button
                  variant="outline"
                  className="border-green-600 text-green-700"
                  onClick={() => setShowProfileModal(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    alert("Perfil atualizado com sucesso!")
                    setShowProfileModal(false)
                  }}
                >
                  Salvar
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
