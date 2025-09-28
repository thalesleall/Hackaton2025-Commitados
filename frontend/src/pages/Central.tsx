// src/pages/Central.tsx
import { useEffect, useMemo, useRef, useState, ReactNode } from "react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Home, User, Settings, MessageSquarePlus, Paperclip, X } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import ChatBot from "../components/chatbot"
import { Dropdown } from "../components/DropDown"
import { Carregar}

/* ================================
   Tipos
================================ */
type ChatListItem = {
  id: string
  nome: string
  protocolo: string
  canal: string
  status: string
  msg: string
}

/* ================================
   Modal fullscreen reutilizável
================================ */
function ModalFullscreen({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white w-full h-full p-6 flex flex-col"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            {/* Header */}
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-semibold text-green-700">{title}</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="flex-1 overflow-y-auto mt-4">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/* ================================
   Página Central
================================ */
export default function Central() {
  const [search, setSearch] = useState("")
  const [showChat, setShowChat] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showAccessibility, setShowAccessibility] = useState(false)
  const [activeChat, setActiveChat] = useState<string | null>(null)

  // Estados modais
  const [openProfileModal, setOpenProfileModal] = useState(false)
  const [openSettingsModal, setOpenSettingsModal] = useState(false)

  // Acessibilidade
  const [isLargeFont, setIsLargeFont] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)

  // Backend
  const [items, setItems] = useState<ChatListItem[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  // Upload (pré-pronto)
  const [attachOpen, setAttachOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  // Carregar conversas ou criar uma nova
  useEffect(() => {
    const fetchData = async () => {
      const userId = localStorage.getItem("idUser") || "";
      if (!userId) return;
      try {
        setLoading(true);
        setLoadError(null);

        let conversas = await CarregarConversas(userId);

        // Se não houver conversas, crie uma nova.
        if (!Array.isArray(conversas) || conversas.length === 0) {
          const novaConversa = await CriarConversa(userId);
          // Adiciona a nova conversa em um array para manter o formato consistente.
          conversas = [novaConversa];
        }

        // Pega a conversa mais recente do array
        const ultimaConversa = conversas[conversas.length - 1];
        const ultimaMensagem = ultimaConversa.mensagens?.length
          ? ultimaConversa.mensagens[ultimaConversa.mensagens.length - 1]
          : null;

        const item: ChatListItem = {
          id: String(ultimaConversa.id),
          nome: "Conversa atual",
          protocolo: `#${String(ultimaConversa.id).slice(0, 6)}`,
          canal: "Chat",
          status: "Atualizada recentemente",
          msg: ultimaMensagem?.texto || "Inicie a conversa.",
        };

        setItems([item]);
        setActiveChat(ultimaConversa.id);
      } catch (err: any) {
        console.error(err);
        setLoadError("Não foi possível carregar ou criar a conversa.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredChats = useMemo(() => {
    const term = search.toLowerCase()
    return items.filter(
      (c) =>
        c.nome.toLowerCase().includes(term) ||
        c.protocolo.toLowerCase().includes(term)
    )
  }, [items, search])

  const handlePickFile = () => fileInputRef.current?.click()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    if (!file) return
    if (!/\.pdf$/i.test(file.name)) {
      alert("Selecione um arquivo PDF.")
      e.target.value = ""
      return
    }
    setSelectedFile(file)
  }

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isHighContrast ? "bg-black text-white" : "bg-[#f7fdf9] text-black"
      } ${isLargeFont ? "text-lg" : "text-base"}`}
    >
    <div
      className={`min-h-screen flex flex-col ${
        isHighContrast ? "bg-black text-white" : "bg-[#f7fdf9] text-black"
      } ${isLargeFont ? "text-lg" : "text-base"}`}
    >
      {/* Barra Superior */}
      <header className="flex justify-between items-center px-6 py-3 bg-white shadow-sm border-b border-green-200 relative">
        <img src="/logo.png" alt="Unimed logo" className="h-8" />
        <div className="flex gap-6 items-center relative">
          {/* Home */}
          <Home
            className="text-green-700 cursor-pointer"
            onClick={() => {
              setShowChat(false)
              setActiveChat(null)
            }}
          />

          {/* Perfil */}
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
                    setOpenProfileModal(true)
                    setShowProfile(false)
                  }}
                >
                  Meu Perfil
                </li>
                <li
                  className="cursor-pointer hover:text-green-700"
                  onClick={() => {
                    setOpenSettingsModal(true)
                    setShowProfile(false)
                  }}
                >
                  Configurações
                </li>
                <li
                  className="cursor-pointer text-red-600 hover:text-red-700"
                  onClick={() => {
                    localStorage.clear()
                    window.location.href = "/login"
                  }}
                >
                  Sair
                </li>
              </ul>
            </Dropdown>
          </div>

          {/* Acessibilidade */}
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
                  onClick={() => setIsLargeFont(!isLargeFont)}
                >
                  {isLargeFont ? "Diminuir Fonte" : "Aumentar Fonte"}
                </Button>
                <Button
                  variant="outline"
                  className="border-green-600 text-green-700"
                  onClick={() => setIsHighContrast(!isHighContrast)}
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

      {/* Conteúdo principal */}
      <main className="flex flex-1 p-6 gap-6 overflow-hidden min-h-0">
        {/* Sidebar */}
        <aside className="w-64 bg-white shadow-sm rounded-2xl p-4 flex flex-col gap-3 self-start">
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

          {loading && (
            <div className="text-xs text-gray-500">Carregando conversas…</div>
          )}
          {loadError && <div className="text-xs text-red-600">{loadError}</div>}
        </aside>

        {/* Área principal */}
        <section className="flex-1 flex flex-col gap-4 min-h-0">
          <AnimatePresence mode="wait">
            {!showChat ? (
              // Lista de conversas
              <motion.div
                key="conversations"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col gap-4 flex-1 min-h-0"
              >
                <Input
                  placeholder="Buscar conversa por nome ou protocolo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="border-green-500"
                />

                <div className="flex-1 overflow-y-auto pr-2">
                  {filteredChats.map((chat) => (
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

                  {!loading && filteredChats.length === 0 && (
                    <div className="text-sm text-gray-500">
                      Nenhuma conversa encontrada.
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              // Chat
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.3 }}
                className="flex-1 relative"
              >
                {activeChat && (
                  <ChatBot
                    conversationId={activeChat}
                    onClose={() => setShowChat(false)}
                  />
                )}

                {/* Anexar PDF */}
                <button
                  className="absolute left-4 bottom-4 w-10 h-10 rounded-full bg-white border shadow-sm hover:shadow-md flex items-center justify-center"
                  onClick={() => setAttachOpen(true)}
                >
                  <Paperclip className="text-green-700 w-5 h-5" />
                </button>

                <AnimatePresence>
                  {attachOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.2 }}
                      className="absolute left-4 bottom-20 w-80 bg-white border rounded-xl shadow-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-semibold text-green-700">
                          Selecionar documento (PDF)
                        </h3>
                        <button
                          className="p-1 rounded hover:bg-gray-100"
                          onClick={() => setAttachOpen(false)}
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleFileChange}
                      />

                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          className="border-green-600 text-green-700"
                          onClick={handlePickFile}
                        >
                          Escolher PDF
                        </Button>

                        {selectedFile && (
                          <span className="text-xs text-gray-600 truncate max-w-[10rem]">
                            {selectedFile.name}
                          </span>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>

      {/* Botão flutuante */}
      {!showChat && (
        <button
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 flex items-center justify-center shadow-lg"
          onClick={() => {
            setShowChat(true)
            if (items.length > 0) {
              setActiveChat(items[0].id)
            }
          }}
        >
          <MessageSquarePlus className="text-white w-7 h-7" />
        </button>
      )}

      <footer className="text-center py-3 text-xs text-gray-500 border-t border-green-200">
        © Projeto Hackathon — layout Verde Unimed
      </footer>

      {/* Modais */}
      <ModalFullscreen
        open={openProfileModal}
        onClose={() => setOpenProfileModal(false)}
        title="Meu Perfil"
      >
        <p>Aqui você pode visualizar e editar informações do usuário.</p>
        <p>
          <strong>ID:</strong> {localStorage.getItem("idUser")}
        </p>
      </ModalFullscreen>

      <ModalFullscreen
        open={openSettingsModal}
        onClose={() => setOpenSettingsModal(false)}
        title="Configurações"
      >
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
        </div>
      </ModalFullscreen>
    </div>
  )
}
