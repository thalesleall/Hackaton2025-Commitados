// Importa o dotenv para carregar as variáveis de ambiente do arquivo .env
import "dotenv/config";

// Módulos nativos do Node.js para manipulação de arquivos e caminhos
import fs from "fs";
import path from "path";

// Importa apenas o cliente de inferência da Hugging Face
import { InferenceClient } from "@huggingface/inference";

// Importa o tipo Message para tipagem do histórico
import { Message } from "../models/conversation.model"; 

/**
 * Classe responsável por gerenciar as interações com a IA da Hugging Face
 */
export class IaService {
  private client: InferenceClient;
  private contextoInstitucional: string;

  constructor() {
    // Obtém a chave da API Hugging Face da variável de ambiente
    const HF_API_KEY: string | undefined = process.env.HUGGINGFACE_API_KEY;

    // Verifica se a chave da API está definida
    if (!HF_API_KEY) {
      throw new Error("A variável de ambiente HUGGINGFACE_API_KEY não está definida.");
    }

    // Cria um cliente de inferência autenticado
    this.client = new InferenceClient(HF_API_KEY);
    
    // Carrega o contexto institucional
    this.contextoInstitucional = this.loadInstitutionalContext();
  }

  /**
   * Carrega o contexto institucional do arquivo de texto
   * @returns Conteúdo do contexto institucional
   */
  private loadInstitutionalContext(): string {
    const contextPath: string = path.join(__dirname, "..", "./learning/contexto.txt");
    
    try {
      // Lê o arquivo "contexto.txt" que contém informações institucionais
      // Esse conteúdo será enviado como "system prompt" para o modelo
      const contexto = fs.readFileSync(contextPath, "utf-8");
      console.log("Contexto institucional carregado com sucesso.");
      return contexto;
    } catch (error) {
      console.error(`Erro ao ler o arquivo de contexto em ${contextPath}:`, error);
      // Contexto padrão de fallback
      const contextoFallback = "Você é um assistente prestativo especializado em atendimento médico e agendamentos.";
      console.log("Usando contexto padrão de fallback.");
      return contextoFallback;
    }
  }

  /**
   * Método público para conversar com a IA
   * 
   * @param mensagem - Mensagem do usuário
   * @param historicoMensagens - Histórico de mensagens anteriores da conversa
   * @returns Resposta gerada pela IA
   */
  public async conversar(mensagem: string, historicoMensagens?: Message[]): Promise<string> {
    console.log(`[IA] Recebida mensagem: "${mensagem}"`);
    
    try {
      // Define as mensagens para a chamada da API
      // Usando 'any[]' para a tipagem do array de mensagens,
      // garantindo compatibilidade com a estrutura esperada pela API
      // sem depender de um tipo exportado específico.
      const messages: any[] = [ 
        {
          role: "system", // Define o contexto institucional como instrução de sistema
          content: this.contextoInstitucional,
        }
      ];

      // Adiciona o histórico de mensagens anteriores se existir
      if (historicoMensagens && historicoMensagens.length > 0) {
        for (const msg of historicoMensagens) {
          messages.push({
            role: msg.remetente === 'usuario' ? 'user' : 'assistant',
            content: msg.texto,
          });
        }
      }

      // Adiciona a pergunta atual do usuário
      messages.push({
        role: "user",
        content: mensagem,
      });

      // Faz a chamada ao endpoint de chat da Hugging Face
      const chatCompletion = await this.client.chatCompletion({
        provider: "fireworks-ai", // Provedor que hospeda o modelo
        model: "meta-llama/Llama-3.1-8B-Instruct", // Modelo utilizado
        messages: messages,
        // Você pode adicionar mais opções aqui, como temperature, max_tokens, etc.
        // temperature: 0.7,
        // max_tokens: 150,
      });

      // Retorna a resposta da IA (se existir), caso contrário "Sem resposta."
      const resposta = chatCompletion.choices?.[0]?.message?.content || "Sem resposta.";
      console.log(`[IA] Resposta gerada: "${resposta.substring(0, 100)}..."`);
      return resposta;
    } catch (error) {
      // Em caso de erro, loga no console
      console.error("Erro ao fazer requisição chatCompletion para Hugging Face:", error);

      // Adiciona tipagem ao erro para acessar propriedades específicas, se aplicável
      if (error instanceof Error) {
          return `Erro ao obter resposta da IA: ${error.message}`;
      }
      return "Erro desconhecido ao obter resposta da IA.";
    }
  }

  /**
   * Método para recarregar o contexto institucional (caso o arquivo seja atualizado)
   */
  public recarregarContexto(): void {
    this.contextoInstitucional = this.loadInstitutionalContext();
    console.log("[IA] Contexto institucional recarregado.");
  }
}