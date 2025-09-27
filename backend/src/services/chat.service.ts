// chat.service.ts

import { DatabaseService } from './database.service';
import { IaService } from './IA.service';
import { Conversation, Message } from '../models/conversation.model';

export class ChatService {
  private readonly INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutos em milissegundos

  constructor(
    private databaseService: DatabaseService,
    private iaService: IaService
  ) {
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

    // 2. Obter resposta da IA incluindo o histórico da conversa
    const iaResponseText = await this.iaService.askHuggingFace(mensagemDoUsuario, currentConversation.mensagens);

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
}