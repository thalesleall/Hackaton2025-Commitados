// Importa o dotenv para carregar as variáveis de ambiente do arquivo .env
import "dotenv/config";

// Módulos nativos do Node.js para manipulação de arquivos e caminhos
import fs from "fs";
import path from "path";

// Importa apenas o cliente de inferência da Hugging Face
import { InferenceClient } from "@huggingface/inference";

// Importa o tipo Message para tipagem do histórico
import { Message } from "../models/conversation.model"; 

// --- Configuração ---
// Obtém a chave da API Hugging Face da variável de ambiente
const HF_API_KEY: string | undefined = process.env.HUGGINGFACE_API_KEY;

// Verifica se a chave da API está definida
if (!HF_API_KEY) {
  throw new Error("A variável de ambiente HUGGINGFACE_API_KEY não está definida.");
}

// Cria um cliente de inferência autenticado
const client = new InferenceClient(HF_API_KEY);

// ===== Preparação do contexto institucional =====
// O caminho para o arquivo de contexto
const contextPath: string = path.join(__dirname, "..", "./learning/contexto.txt"); 
let contextoInstitucional: string;

try {
  // Lê o arquivo "contexto.txt" que contém informações institucionais
  // Esse conteúdo será enviado como "system prompt" para o modelo
  contextoInstitucional = fs.readFileSync(contextPath, "utf-8");
  console.log("Contexto institucional carregado com sucesso.");
} catch (error) {
  console.error(`Erro ao ler o arquivo de contexto em ${contextPath}:`, error);
  // Você pode optar por lançar um erro ou definir um contexto padrão aqui
  contextoInstitucional = "Você é um assistente prestativo."; // Contexto padrão de fallback
  console.log("Usando contexto padrão de fallback.");
}

/**
 * Função responsável por enviar uma pergunta ao modelo de IA da Hugging Face
 *
 * @param question - Pergunta feita pelo usuário
 * @param historicoMensagens - Histórico de mensagens anteriores da conversa
 * @returns Resposta gerada pela IA
 */
export async function askHuggingFace(question: string, historicoMensagens?: Message[]): Promise<string> {
  try {
    // Definir funções disponíveis para a IA
    const functions = [
      {
        name: "agendar_consulta",
        description: "Agenda uma consulta médica quando o usuário quer marcar, agendar ou precisa de consulta",
        parameters: {
          type: "object",
          properties: {
            nome_paciente: { type: "string", description: "Nome completo do paciente" },
            cpf_paciente: { type: "string", description: "CPF do paciente com 11 dígitos" },
            especialidade: { type: "string", description: "Especialidade médica necessária" },
            telefone: { type: "string", description: "Telefone do paciente (opcional)" }
          },
          required: ["nome_paciente", "cpf_paciente", "especialidade"]
        }
      },
      {
        name: "cancelar_consulta",
        description: "Cancela uma consulta existente quando o usuário quer cancelar ou desmarcar",
        parameters: {
          type: "object",
          properties: {
            protocolo: { type: "string", description: "Protocolo da consulta (formato CON + 10 dígitos)" }
          },
          required: ["protocolo"]
        }
      },
      {
        name: "consultar_agendamentos",
        description: "Busca consultas do paciente quando ele quer ver seus agendamentos",
        parameters: {
          type: "object",
          properties: {
            cpf_paciente: { type: "string", description: "CPF do paciente com 11 dígitos" }
          },
          required: ["cpf_paciente"]
        }
      }
    ];

    // Define as mensagens para a chamada da API
    const messages: any[] = [ 
      {
        role: "system",
        content: `${contextoInstitucional}

INSTRUÇÕES DE ANÁLISE:
1. Analise a mensagem do usuário para identificar a intenção
2. Extraia todas as informações disponíveis (nome, CPF, especialidade, protocolo)
3. Se tiver dados suficientes, chame a função apropriada
4. Se faltar dados essenciais, responda pedindo apenas o que falta

IMPORTANTE: Sempre tente interpretar variações de linguagem e mapeie para as funções corretas.`
      }
    ];

    // Adiciona apenas as 2 últimas mensagens do histórico (para evitar contexto excessivo)
    if (historicoMensagens && historicoMensagens.length > 0) {
      const ultimasMensagens = historicoMensagens.slice(-2);
      for (const msg of ultimasMensagens) {
        messages.push({
          role: msg.remetente === 'usuario' ? 'user' : 'assistant',
          content: msg.texto,
        });
      }
    }

    // Adiciona a pergunta atual do usuário
    messages.push({
      role: "user",
      content: question,
    });

    // Faz a chamada ao endpoint de chat da Hugging Face com function calling
    const chatCompletion = await client.chatCompletion({
      provider: "fireworks-ai",
      model: "meta-llama/Llama-3.1-8B-Instruct",
      messages: messages,
      tools: functions.map(func => ({ type: "function", function: func })),
      tool_choice: "auto", // Permite que a IA escolha quando usar funções
      temperature: 0.3, // Menor temperatura para respostas mais consistentes
      max_tokens: 200,
    });

    const response = chatCompletion.choices?.[0]?.message;

    // Verificar se a IA quer usar uma função
    if (response?.tool_calls && response.tool_calls.length > 0) {
      const toolCall = response.tool_calls[0];
      const functionName = toolCall.function?.name;
      const functionArgs = JSON.parse(toolCall.function?.arguments || '{}');

      // Retornar indicação de que deve usar função
      return JSON.stringify({
        useFunction: true,
        functionName: functionName,
        arguments: functionArgs
      });
    }

    // Retorna a resposta normal da IA se não usar função
    return response?.content || "Não entendi. Posso ajudar com agendamentos, cancelamentos ou consultas.";
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

export class IaService {
  /**
   * Chama o modelo de IA da Hugging Face incluindo o contexto da conversa.
   *
   * @param mensagem Mensagem atual do usuário.
   * @param historicoMensagens Histórico de mensagens da conversa atual.
   * @returns Resposta gerada pela IA.
   */
  public async askHuggingFace(mensagem: string, historicoMensagens?: Message[]): Promise<string> {
    console.log(`[IA] Recebida mensagem: "${mensagem}"`);
    
    // Usar a função real do Hugging Face incluindo o histórico
    return await askHuggingFace(mensagem, historicoMensagens);
  }
}