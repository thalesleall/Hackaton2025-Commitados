import { useEffect, useState, useRef, useCallback } from "react"
import { Input } from "./ui/input"
import { Button } from "./ui/button"
import { ArrowLeft, Paperclip } from "lucide-react"
import { sendMessage, extractTextFromPDF, getConversation, uploadAutorizacaoExame } from "../service/api"

type Message = {
  sender: "user" | "bot"
  text: string
  timestamp?: string
}

type Props = {
  conversationId: string | null
  onClose: () => void
  onConversationCreated?: (conversationId: string) => void
}

export default function ChatBot({ conversationId, onClose, onConversationCreated }: Props) {
  // Estados principais
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [conversationStatus, setConversationStatus] = useState<'aberta' | 'fechada'>('aberta')
  const [isAutorizacaoMode, setIsAutorizacaoMode] = useState(false)
  
  const userId = localStorage.getItem("idUser") || "user123"
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const isInitializedRef = useRef(false)
  const conversationIdRef = useRef<string | null>(null)

  // Scroll para última mensagem
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Função para carregar histórico da conversa
  const loadConversationHistory = useCallback(async (convId: string) => {
    if (!convId || convId === 'new') return
    
    try {
      setIsLoadingHistory(true)
      const data = await getConversation(convId)
      
      if (data?.conversation) {
        // Captura o status da conversa
        setConversationStatus(data.conversation.status_conversa || 'aberta')
        
        // Converte mensagens do backend
        if (data.conversation.mensagens && Array.isArray(data.conversation.mensagens)) {
          const convertedMessages: Message[] = data.conversation.mensagens.map((msg: any) => {
            const remetente = msg.remetente || msg.origem || msg.sender || ''
            const normalizedSender = (remetente?.toLowerCase?.() || '').trim()
            
            let sender: 'user' | 'bot' = 'bot'
            if (normalizedSender === 'usuario' || normalizedSender === 'user') {
              sender = 'user'
            }
            
            return {
              sender,
              text: msg.texto || msg.message || msg.conteudo || 'Mensagem sem conteúdo',
              timestamp: msg.data_hora ? new Date(msg.data_hora).toLocaleTimeString() : new Date().toLocaleTimeString()
            }
          })
          
          setMessages(convertedMessages)
          
          // Aviso para conversa fechada
          if (data.conversation.status_conversa === 'fechada') {
            setTimeout(() => {
              setMessages(prev => [...prev, {
                sender: "bot",
                text: "⚠️ Esta conversa foi encerrada. Não é possível enviar novas mensagens.",
                timestamp: new Date().toLocaleTimeString()
              }])
            }, 500)
          }
        } else {
          setMessages([{
            sender: "bot",
            text: "Conversa carregada! Você pode continuar de onde parou.",
            timestamp: new Date().toLocaleTimeString()
          }])
        }
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      setMessages([{
        sender: "bot",
        text: "Erro ao carregar histórico. Iniciando nova conversa.",
        timestamp: new Date().toLocaleTimeString()
      }])
    } finally {
      setIsLoadingHistory(false)
    }
  }, [])

  // Inicialização do chat - evita resets desnecessários
  useEffect(() => {
    const initializeChat = async () => {
      // Se já foi inicializado e o conversationId não mudou realmente, não faz nada
      if (isInitializedRef.current && conversationIdRef.current === conversationId) {
        return
      }

      // Marca como inicializado e atualiza a ref
      isInitializedRef.current = true
      conversationIdRef.current = conversationId

      // Reset estados apenas para mudanças reais de conversa
      setMessages([])
      setCurrentConversationId(conversationId)
      setConversationStatus('aberta')
      setInput("")
      setIsAutorizacaoMode(false)
      setShowUpload(false)
      
      if (conversationId && conversationId !== 'new') {
        // Carrega conversa existente
        await loadConversationHistory(conversationId)
      } else {
        // Nova conversa - mensagem de boas-vindas
        setMessages([{
          sender: "bot",
          text: "Olá! Sou seu assistente virtual. Como posso ajudá-lo hoje?",
          timestamp: new Date().toLocaleTimeString()
        }])
      }
    }

    initializeChat()

    // Cleanup quando o componente for desmontado
    return () => {
      isInitializedRef.current = false
      conversationIdRef.current = null
    }
  }, [conversationId, loadConversationHistory])

  // Verifica se a conversa está fechada
  const isConversationClosed = conversationStatus === 'fechada'

  const handleSend = async () => {
    if (!input.trim() || isLoading || isConversationClosed) return

    const userMessage: Message = {
      sender: "user",
      text: input.trim(),
      timestamp: new Date().toLocaleTimeString()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      // Envia mensagem com conversation_id se existir
      const payload: any = { text: userMessage.text }
      if (currentConversationId) {
        payload.conversation_id = currentConversationId
      }
      
      const response = await sendMessage(userId, payload)
      
      if (response.conversation?.id) {
        const newConversationId = response.conversation.id
        
        // Se é uma nova conversa, apenas atualiza o estado interno
        if (!currentConversationId) {
          setCurrentConversationId(newConversationId)
          // Atualiza a ref para evitar re-inicialização
          conversationIdRef.current = newConversationId
          // Notifica o pai apenas para recarregar a lista
          if (onConversationCreated) {
            onConversationCreated(newConversationId)
          }
        }
      }

      const botMessage: Message = {
        sender: "bot",
        text: response.reply || "Desculpe, não consegui processar sua mensagem.",
        timestamp: new Date().toLocaleTimeString()
      }

      setMessages(prev => [...prev, botMessage])

      // Detectar se entramos no modo de autorização de exame
      const botText = (response.reply || "").toLowerCase()
      if (botText.includes("sistema de autorização de exames") || 
          botText.includes("envie o arquivo pdf do pedido") ||
          botText.includes("modo de autorização de exames")) {
        setIsAutorizacaoMode(true)
        setShowUpload(true)
      } else if (botText.includes("como posso ajudá-lo hoje") || 
                 botText.includes("olá! como posso ajudá-lo") ||
                 (botText.includes("digite 0 para voltar ao menu") && !botText.includes("autorização"))) {
        setIsAutorizacaoMode(false)
        setShowUpload(false)
      }

    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error)
      
      const errorMessage: Message = {
        sender: "bot", 
        text: "Desculpe, ocorreu um erro. Tente novamente.",
        timestamp: new Date().toLocaleTimeString()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione apenas arquivos PDF.')
      return
    }

    setIsLoading(true)
    setShowUpload(false)

    // Adicionar mensagem do usuário mostrando que enviou um arquivo
    const userMessage: Message = {
      sender: "user",
      text: `📄 Arquivo enviado: ${file.name}`,
      timestamp: new Date().toLocaleTimeString()
    }
    setMessages(prev => [...prev, userMessage])

    try {
      let processResponse

      if (isAutorizacaoMode) {
        // Usar endpoint de autorização de exame
        processResponse = await uploadAutorizacaoExame(file)
      } else {
        // Usar endpoint de OCR normal
        processResponse = await extractTextFromPDF(file)
      }
      
      if (processResponse.conversation?.id) {
        setCurrentConversationId(processResponse.conversation.id)
      }

      const botMessage: Message = {
        sender: "bot",
        text: processResponse.reply || "Documento processado com sucesso!",
        timestamp: new Date().toLocaleTimeString()
      }

      setMessages(prev => [...prev, botMessage])

      // Se processou uma autorização, sair do modo de autorização
      if (isAutorizacaoMode) {
        setIsAutorizacaoMode(false)
      }

    } catch (error: any) {
      console.error('Erro ao processar arquivo:', error)
      
      const errorMessage: Message = {
        sender: "bot",
        text: `❌ Erro ao processar arquivo: ${error.response?.data?.error || error.message || 'Erro desconhecido'}`,
        timestamp: new Date().toLocaleTimeString()
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="flex flex-col w-full h-full max-h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-lg border">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-3 border-b bg-green-50 rounded-t-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={onClose} className="flex-shrink-0 p-1 hover:bg-green-100 rounded-full">
            <ArrowLeft className="text-green-600 w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 bg-green-600 rounded-full flex items-center justify-center">
              <span className="text-white text-xs sm:text-sm font-semibold">AI</span>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-green-700 text-sm sm:text-base truncate">Assistente Virtual</h3>
                {isConversationClosed && (
                  <span className="bg-red-100 text-red-600 text-xs px-2 py-1 rounded-full font-medium">
                    Fechada
                  </span>
                )}
              </div>
              <p className="text-xs text-green-600 truncate">
                {isLoadingHistory 
                  ? "Carregando histórico..." 
                  : isConversationClosed
                    ? "Esta conversa foi encerrada"
                  : currentConversationId 
                    ? `Conversa: ${currentConversationId.slice(-8)}` 
                    : "Nova conversa"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 bg-gray-50 min-h-0">
        <div className="flex flex-col gap-3 min-h-full">
          {isLoadingHistory ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-center">
                <div className="animate-spin w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full mx-auto"></div>
                <p className="mt-2 text-gray-600">Carregando histórico da conversa...</p>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] md:max-w-[70%] p-3 rounded-lg break-words ${
                  message.sender === 'user'
                    ? 'bg-green-600 text-white rounded-br-none'
                    : 'bg-white border rounded-bl-none shadow-sm'
                }`}
              >
              <p className="whitespace-pre-wrap">{message.text}</p>
              {message.timestamp && (
                <p className={`text-xs mt-1 ${
                  message.sender === 'user' ? 'text-green-100' : 'text-gray-500'
                }`}>
                  {message.timestamp}
                </p>
              )}
            </div>
          </div>
          ))
        )}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white border rounded-lg p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-green-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                <span className="text-sm text-gray-500 ml-2">Digitando...</span>
              </div>
            </div>
          </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Área de input */}
      <div className="border-t p-3 sm:p-4 bg-white rounded-b-2xl">
        <div className="flex gap-2 items-end relative">
          <button
            className={`flex-shrink-0 p-2 rounded-full transition-colors ${
              isLoading || isConversationClosed 
                ? 'opacity-50 cursor-not-allowed border border-gray-300' 
                : 'hover:bg-green-50 border border-green-600'
            }`}
            onClick={() => setShowUpload(!showUpload)}
            disabled={isLoading || isConversationClosed}
          >
            <Paperclip className={`w-4 h-4 sm:w-5 sm:h-5 ${
              isLoading || isConversationClosed ? 'text-gray-400' : 'text-green-600'
            }`} />
          </button>

          {showUpload && (
            <div className="absolute bottom-14 left-0 bg-white border shadow-lg rounded-lg p-3 z-10 w-64 sm:w-80">
              {isAutorizacaoMode && (
                <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium">📋 Autorização de Exame</p>
                  <p className="text-xs text-blue-600 mt-1">
                    Envie o PDF do pedido médico para análise
                  </p>
                </div>
              )}
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              <p className="text-xs text-gray-500 mt-1">
                {isAutorizacaoMode 
                  ? "Será processado para identificar exames e auditoria" 
                  : "Apenas arquivos PDF"
                }
              </p>
            </div>
          )}

          <Input
            placeholder={isConversationClosed ? "Conversa encerrada" : "Digite sua mensagem..."}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={isLoading || isConversationClosed}
            className="flex-1 min-w-0"
          />

          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileSelect}
          />

          <Button
            onClick={handleSend}
            disabled={isLoading || !input.trim() || isConversationClosed}
            className="flex-shrink-0 bg-green-600 hover:bg-green-700 text-white px-3 sm:px-6"
          >
            <span className="hidden sm:inline">{isLoading ? "..." : isConversationClosed ? "Bloqueado" : "Enviar"}</span>
            <span className="sm:hidden">{isConversationClosed ? "🔒" : "➤"}</span>
          </Button>
        </div>
      </div>
    </div>
  )
}