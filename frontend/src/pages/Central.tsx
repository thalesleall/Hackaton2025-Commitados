import { useEffect, useState, useRef } from "react"
import { Input } from "../components/ui/input"
import { Button } from "../components/ui/button"
import { Card, CardContent } from "../components/ui/card"
import { Home, User, MessageSquarePlus, Paperclip, X, Settings } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import ChatBot from "../components/chatbot"
import { getConversations, sendMessage, createNewConversation } from "../service/api"

// ===== TIPOS =====
interface Conversation {
  id: string
  titulo: string
  total_messages: number
  created_at: string
  updated_at: string
}

// ===== COMPONENTE PRINCIPAL =====
export default function Central() {
  // Estados principais
  const [activeChat, setActiveChat] = useState<string | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  
  // Configurações de acessibilidade
  const [isLargeFont, setIsLargeFont] = useState(false)
  const [isHighContrast, setIsHighContrast] = useState(false)
  
  const userId = localStorage.getItem("idUser") || "user123"
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Carrega conversas ao inicializar
  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setIsLoading(true)
      const data = await getConversations(userId)
      console.log('Dados das conversas:', data, 'Array?', Array.isArray(data))
      setConversations(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Erro ao carregar conversas:', error)
      setConversations([]) // Garante que seja um array vazio em caso de erro
    } finally {
      setIsLoading(false)
    }
  }

  const handleNewChat = async () => {
    try {
      setIsLoading(true)
      // Chama a nova rota que fecha conversas ativas e cria uma nova
      const result = await createNewConversation(userId)
      console.log('Nova conversa criada:', result)
      
      // Recarrega a lista para mostrar a nova conversa
      await loadConversations()
      
      // Abre a nova conversa criada
      if (result.conversation?.id) {
        setActiveChat(result.conversation.id)
      } else {
        setActiveChat("new")
      }
    } catch (error) {
      console.error('Erro ao criar nova conversa:', error)
      // Em caso de erro, abre conversa local
      setActiveChat("new")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelectConversation = (conversationId: string) => {
    setActiveChat(conversationId)
  }

  const handleCloseChat = () => {
    setActiveChat(null)
    loadConversations() // Recarrega conversas após fechar chat
  }

  const handleConversationCreated = (conversationId: string) => {
    // Não muda o activeChat para evitar reset do chat
    // Apenas recarrega a lista de conversas
    loadConversations()
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && file.type === 'application/pdf') {
      setSelectedFile(file)
    } else {
      alert('Por favor, selecione apenas arquivos PDF.')
    }
  }

  const filteredConversations = (conversations || []).filter(conv => 
    conv?.titulo?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // ===== MODAL DE CONFIGURAÇÕES =====
  const SettingsModal = () => (
    <AnimatePresence>
      {showSettings && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white w-full max-w-md mx-4 p-6 rounded-lg"
            initial={{ y: 50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 50, opacity: 0 }}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-green-700">Configurações</h2>
              <button onClick={() => setShowSettings(false)}>
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            
            <div className="space-y-4">
              <Button
                variant="outline"
                className="w-full border-green-600 text-green-700"
                onClick={() => setIsLargeFont(!isLargeFont)}
              >
                {isLargeFont ? "Diminuir Fonte" : "Aumentar Fonte"}
              </Button>
              
              <Button
                variant="outline"
                className="w-full border-green-600 text-green-700"
                onClick={() => setIsHighContrast(!isHighContrast)}
              >
                {isHighContrast ? "Desativar Alto Contraste" : "Ativar Alto Contraste"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // ===== DROPDOWN DE PERFIL =====
  
  return (
    <div
      className={`min-h-screen flex flex-col ${
        isHighContrast ? "bg-black text-white" : "bg-[#f7fdf9] text-black"
      } ${isLargeFont ? "text-lg" : "text-base"}`}
    >
      {/* Barra Superior Fixa */}
      <header className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-6 py-3 bg-white shadow-lg border-b border-green-200 backdrop-blur-sm">
        <div className="flex gap-6 items-center">
          <div title="Voltar ao início">
            <Home 
              className="text-green-600 w-6 h-6 cursor-pointer hover:text-green-700 transition-colors" 
              onClick={() => setActiveChat(null)}
            />
          </div>

          
        </div>

        <h1 className="text-xl font-semibold text-green-700">
          {activeChat ? (
            <span className="flex items-center gap-2">
              <span>Chat Ativo</span>
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            </span>
          ) : (
            "Central de Atendimento"
          )}
        </h1>

        <div className="flex gap-4 items-center">
          
        </div>
      </header>

      {/* Espaçamento para compensar header fixo */}
      <div className="h-16"></div>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex min-h-0">
        {!activeChat ? (
          // Lista de conversas
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-green-700">Minhas Conversas</h2>
                <Button
                  onClick={handleNewChat}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2 w-full sm:w-auto"
                >
                  <MessageSquarePlus className="w-4 h-4" />
                  <span className="sm:inline">Nova Conversa</span>
                </Button>
              </div>

              {/* Busca */}
              <div className="mb-6">
                <Input
                  placeholder="Buscar conversas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full max-w-md"
                />
              </div>

              {/* Lista de conversas */}
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
                  <p className="mt-4 text-gray-600">Carregando conversas...</p>
                </div>
              ) : filteredConversations.length > 0 ? (
                <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredConversations.map((conversation) => (
                    <Card
                      key={conversation.id}
                      className="cursor-pointer hover:shadow-md transition-shadow border-green-200"
                      onClick={() => handleSelectConversation(conversation.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h3 className="font-semibold text-green-700 truncate">
                            {conversation.titulo || `Conversa ${conversation.id.slice(-8)}`}
                          </h3>
                          <span className="text-xs text-gray-500">
                            {conversation.total_messages} msgs
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          Última atualização: {new Date(conversation.updated_at).toLocaleDateString('pt-BR')}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <MessageSquarePlus className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 mb-2">
                    Nenhuma conversa encontrada
                  </h3>
                  <p className="text-gray-500 mb-4">
                    {searchTerm ? "Tente ajustar sua busca" : "Comece uma nova conversa para começar"}
                  </p>
                  <Button
                    onClick={handleNewChat}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Nova Conversa
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Interface do ChatBot
          <div className="flex-1 p-4 min-h-0">
            <div className="h-full w-full max-w-6xl mx-auto">
              <ChatBot
                conversationId={activeChat === "new" ? null : activeChat}
                onClose={handleCloseChat}
                onConversationCreated={handleConversationCreated}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <SettingsModal />

      {/* Input de arquivo oculto */}
      <input
        type="file"
        accept="application/pdf"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
    </div>
  )
}