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
   * Carrega o contexto institucional do arquivo JSON
   * @returns Conteúdo do contexto institucional formatado
   */
  private loadInstitutionalContext(): string {
    const contextPath: string = path.join(__dirname, "..", "./learning/contexto.json");
    
    try {
      // Lê o arquivo "contexto.json" que contém informações institucionais estruturadas
      const contextoRaw = fs.readFileSync(contextPath, "utf-8");
      const contextoJson = JSON.parse(contextoRaw);
      
      // Converte o JSON em texto estruturado para a IA
      const contextoFormatado = this.formatContextForAI(contextoJson);
      
      console.log("Contexto institucional JSON carregado com sucesso.");
      return contextoFormatado;
    } catch (error) {
      console.error(`Erro ao ler o arquivo de contexto JSON em ${contextPath}:`, error);
      
      // Contexto padrão de fallback mais robusto
      const contextoFallback = `Você é um assistente especializado em atendimento de clínica médica.

INFORMAÇÕES BÁSICAS:
- Você trabalha para uma clínica de saúde
- Pode ajudar com: dúvidas sobre procedimentos, orientações gerais
- Sempre seja empático e profissional
- Em caso de dúvidas específicas, oriente o paciente a entrar em contato diretamente

IMPORTANTE:
- Não forneça diagnósticos médicos
- Não substitua consultas presenciais
- Sempre priorize a segurança do paciente`;

      console.log("Usando contexto padrão de fallback.");
      return contextoFallback;
    }
  }

  /**
   * Formata o contexto JSON em texto estruturado para a IA
   */
  private formatContextForAI(contextoJson: any): string {
    const base = contextoJson.base_conhecimento;
    
    let contextoFormatado = `VOCÊ É UM ASSISTENTE ESPECIALIZADO EM ATENDIMENTO DE CLÍNICA MÉDICA

=== OBJETIVO ===
${base.introducao.objetivo}

=== ATORES PRINCIPAIS ===`;

    // Adiciona informações sobre beneficiários
    if (base.atores.beneficiario) {
      const beneficiario = base.atores.beneficiario;
      contextoFormatado += `
BENEFICIÁRIOS/PACIENTES:
- Descrição: ${beneficiario.descricao}
- Canais de atendimento: ${beneficiario.canais.join(', ')}
- Tipos: ${beneficiario.tipos.join(', ')}`;
    }

    // Adiciona informações sobre atendimento
    if (base.atores.atendimento) {
      const atendimento = base.atores.atendimento;
      contextoFormatado += `

PROTOCOLO DE ATENDIMENTO:
- Sempre manter: ${atendimento.protocolos.join(', ')}
- Canais disponíveis: ${atendimento.canais.join(', ')}`;
    }

    contextoFormatado += `

=== PRINCIPAIS PROCESSOS QUE VOCÊ PODE AJUDAR ===`;

    // Adiciona processos principais
    if (base.processos) {
      Object.keys(base.processos).forEach(processo => {
        const proc = base.processos[processo];
        const nomeFormatado = processo.replace(/_/g, ' ').toUpperCase();
        
        contextoFormatado += `

${nomeFormatado}:`;
        
        if (proc.dados_referencia) {
          const dados = proc.dados_referencia;
          if (dados.campos_obrigatorios) {
            contextoFormatado += `
- Campos obrigatórios: ${dados.campos_obrigatorios.join(', ')}`;
          }
          if (dados.canais) {
            contextoFormatado += `
- Canais disponíveis: ${dados.canais.join(', ')}`;
          }
          if (dados.tempo_medio) {
            contextoFormatado += `
- Tempo médio: ${dados.tempo_medio}`;
          }
        }
        
        if (proc.exemplos && proc.exemplos.length > 0) {
          contextoFormatado += `
- Exemplos: ${proc.exemplos.join(' | ')}`;
        }
      });
    }

    // Adiciona glossário
    if (base.glossario) {
      contextoFormatado += `

=== GLOSSÁRIO IMPORTANTE ===`;
      Object.keys(base.glossario).forEach(termo => {
        contextoFormatado += `
- ${termo}: ${base.glossario[termo]}`;
      });
    }

    // Adiciona siglas/abreviações
    if (base.abrev_siglas) {
      contextoFormatado += `

=== SIGLAS E ABREVIAÇÕES ===`;
      Object.keys(base.abrev_siglas).forEach(sigla => {
        contextoFormatado += `
- ${sigla}: ${base.abrev_siglas[sigla]}`;
      });
    }

    // Adiciona observações importantes para IA
    if (base.observacoes_ia) {
      contextoFormatado += `

=== DIRETRIZES IMPORTANTES PARA SUAS RESPOSTAS ===`;
      base.observacoes_ia.forEach((obs: string, index: number) => {
        contextoFormatado += `
${index + 1}. ${obs}`;
      });
    }

    contextoFormatado += `

=== INSTRUÇÕES FINAIS ===
- Sempre seja empático e profissional
- Use as informações do contexto para dar respostas precisas
- Se não souber algo específico, oriente o paciente a entrar em contato direto
- Nunca forneça diagnósticos médicos - apenas orientações gerais
- Sempre priorize a segurança e bem-estar do paciente
- Use linguagem clara e acessível`;

    return contextoFormatado;
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