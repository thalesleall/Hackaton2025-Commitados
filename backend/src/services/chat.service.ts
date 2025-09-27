// chat.service.ts

import { DatabaseService } from './database.service';
import { IaService } from './IA.service';
import { Conversation, Message } from '../models/conversation.model';
import { AgendamentoFunctions } from './agendamento-functions.service';

export class ChatService {
  private readonly INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutos em milissegundos
  private agendamentoFunctions: AgendamentoFunctions;

  constructor(
    private databaseService: DatabaseService,
    private iaService: IaService
  ) {
    this.agendamentoFunctions = new AgendamentoFunctions();
    console.log('ChatService inicializado.');
  }

  /**
   * Processa uma nova mensagem do usuário, gerencia a conversa e retorna a resposta da IA.
   * @param idUsuario ID do usuário.
   * @param mensagemDoUsuario Texto da mensagem do usuário.
   * @returns A resposta da IA.
   */
  public async processUserMessage(idUsuario: string, mensagemDoUsuario: string): Promise<string> {
    let currentConversation: Conversation | null = await this.databaseService.findLatestConversationByUserId(idUsuario);
    const now = new Date();

    // 1. Verificar se a conversa existente é válida ou se precisamos criar uma nova.
    if (currentConversation) {
      const timeElapsed = now.getTime() - currentConversation.data_hora_ultima_mensagem.getTime();

      if (timeElapsed > this.INACTIVITY_LIMIT_MS) {
        // Conversa existente expirou, marcá-la como inativa e criar uma nova
        console.log(`[ChatService] Conversa ${currentConversation.id_conversa} do usuário ${idUsuario} expirou por inatividade.`);
        currentConversation.status_conversa = 'inativa';
        await this.databaseService.updateConversation(currentConversation); // Salvar status da conversa antiga

        currentConversation = await this.databaseService.createConversation(idUsuario, mensagemDoUsuario);
      } else {
        // Conversa existente ainda está ativa, adicionar a mensagem do usuário
        currentConversation.mensagens.push({
          remetente: 'usuario',
          texto: mensagemDoUsuario,
          data_hora: now,
        });
        currentConversation.data_hora_ultima_mensagem = now;
        currentConversation.status_conversa = 'aberta'; // Garantir que está aberta se foi inativa e reativada
        await this.databaseService.updateConversation(currentConversation);
      }
    } else {
      // Nenhuma conversa encontrada para o usuário, criar uma nova
      currentConversation = await this.databaseService.createConversation(idUsuario, mensagemDoUsuario);
    }

    // A partir daqui, currentConversation é garantidamente uma conversa ativa para continuar.

    // 2. Processar mensagem com IA inteligente
    let iaResponseText: string;
    
    // Usar IA para interpretar a mensagem
    const iaResponse = await this.iaService.askHuggingFace(mensagemDoUsuario, currentConversation.mensagens);
    
    // Verificar se a IA quer usar uma função
    try {
      const functionCall = JSON.parse(iaResponse);
      
      if (functionCall.useFunction) {
        // IA detectou intenção e extraiu dados - processar função
        iaResponseText = await this.processarFuncaoIA(functionCall.functionName, functionCall.arguments);
      } else {
        // Resposta normal da IA
        iaResponseText = iaResponse;
      }
    } catch {
      // Se não for JSON válido, é resposta normal
      iaResponseText = iaResponse;
    }

    // 3. Adicionar a resposta da IA à conversa e atualizar no banco
    if (currentConversation) { // currentConversation nunca será null aqui, mas para segurança do TS
      currentConversation.mensagens.push({
        remetente: 'chatbot',
        texto: iaResponseText,
        data_hora: new Date(), // Usar new Date() para a resposta da IA
      });
      currentConversation.data_hora_ultima_mensagem = new Date(); // Atualizar novamente a última mensagem
      await this.databaseService.updateConversation(currentConversation);
    }

    return iaResponseText;
  }

  /**
   * Processa funções identificadas pela IA
   */
  private async processarFuncaoIA(functionName: string, args: any): Promise<string> {
    try {
      switch (functionName) {
        case 'agendar_consulta':
          return await this.agendamentoFunctions.processarComandoAgendamento({
            intencao: 'agendar',
            nome: args.nome_paciente,
            cpf: args.cpf_paciente,
            especialidade: args.especialidade,
            telefone: args.telefone
          });
        
        case 'cancelar_consulta':
          return await this.agendamentoFunctions.processarComandoAgendamento({
            intencao: 'cancelar',
            protocolo: args.protocolo
          });
        
        case 'consultar_agendamentos':
          return await this.agendamentoFunctions.processarComandoAgendamento({
            intencao: 'consultar',
            cpf: args.cpf_paciente
          });
        
        default:
          return "Função não reconhecida. Posso ajudar com agendamentos, cancelamentos ou consultas.";
      }
    } catch (error) {
      console.error('[ChatService] Erro ao processar função da IA:', error);
      return "Erro ao processar solicitação. Tente novamente.";
    }
  }

  /**
   * Detecta comandos diretos sem usar IA (mantido como fallback)
   */
  private detectarComandoDireto(mensagem: string): { detectado: boolean; informacoes: any } {
    const msg = mensagem.toLowerCase().trim();
    const resultado: { detectado: boolean; informacoes: any } = { 
      detectado: false, 
      informacoes: { intencao: null } 
    };

    // Padrões rígidos de comandos
    const padroes = {
      agendar: /(?:agendar|marcar)\s+(cardiologia|dermatologia|ortopedia|ginecologia|pediatria)\s+para\s+([a-záç\s]+)\s+cpf\s+(\d{11})/i,
      cancelar: /cancelar\s+(con\d{10})/i,
      consultar: /(?:minhas consultas|meus agendamentos)\s+cpf\s+(\d{11})/i
    };

    // Testar padrão de agendamento
    const matchAgendar = mensagem.match(padroes.agendar);
    if (matchAgendar) {
      resultado.detectado = true;
      resultado.informacoes = {
        intencao: 'agendar',
        especialidade: matchAgendar[1].charAt(0).toUpperCase() + matchAgendar[1].slice(1),
        nome: matchAgendar[2].trim(),
        cpf: matchAgendar[3]
      };
      return resultado;
    }

    // Testar padrão de cancelamento
    const matchCancelar = mensagem.match(padroes.cancelar);
    if (matchCancelar) {
      resultado.detectado = true;
      resultado.informacoes = {
        intencao: 'cancelar',
        protocolo: matchCancelar[1].toUpperCase()
      };
      return resultado;
    }

    // Testar padrão de consulta
    const matchConsultar = mensagem.match(padroes.consultar);
    if (matchConsultar) {
      resultado.detectado = true;
      resultado.informacoes = {
        intencao: 'consultar',
        cpf: matchConsultar[1]
      };
      return resultado;
    }

    return resultado;
  }
}