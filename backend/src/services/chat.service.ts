// chat.service.ts

import { IaService } from './IA.service';
import { DatabaseService } from './database.service';
import { Message, Conversation } from '../models/conversation.model';

export class ChatService {
  constructor(
    private iaService: IaService,
    private databaseService?: DatabaseService
  ) {
    console.log('ChatService inicializado.');
  }

  /**
   * Processa mensagem do usuário com sistema de menu e salva no banco de dados
   */
  public async processUserMessage(
    mensagemDoUsuario: string, 
    idUsuario: string,
    conversationId?: string
  ): Promise<{
    resposta: string;
    conversation: Conversation;
  }> {
    console.log(`[ChatService] Processando mensagem de ${idUsuario}: "${mensagemDoUsuario}"`);
    
    let conversation: Conversation | null = null;

    // 1. Buscar ou criar conversa
    if (conversationId && this.databaseService) {
      // Buscar conversa existente
      conversation = await this.databaseService.getConversationById(conversationId);
      
      // Verificar se a conversa está inativa (mais de 10 minutos)
      if (conversation && this.databaseService.isConversationInactive(conversation)) {
        console.log(`[ChatService] Conversa ${conversationId} inativa há mais de 10 minutos. Iniciando nova conversa.`);
        conversation = null; // Força criação de nova conversa
      }
    } else if (this.databaseService) {
      // Buscar conversa mais recente do usuário
      conversation = await this.databaseService.findLatestConversationByUserId(idUsuario);
      
      // Verificar se a conversa está inativa (mais de 10 minutos)
      if (conversation && this.databaseService.isConversationInactive(conversation)) {
        console.log(`[ChatService] Última conversa do usuário ${idUsuario} inativa há mais de 10 minutos. Iniciando nova conversa.`);
        conversation = null; // Força criação de nova conversa
      }
    }

    // 2. Se não encontrou conversa, criar uma nova
    if (!conversation) {
      conversation = {
        id_usuario: idUsuario,
        id_conversa: `temp-${Date.now()}`, // ID temporário
        titulo: 'Menu de Atendimento',
        data_hora_inicio: new Date(),
        data_hora_ultima_mensagem: new Date(),
        status_conversa: 'aberta',
        mensagens: [],
        menu_state: 'menu' // Sempre inicia no menu
      };
    }

    // 3. Adicionar nova mensagem do usuário
    const novaMensagemUsuario: Message = {
      remetente: 'usuario',
      texto: mensagemDoUsuario,
      data_hora: new Date()
    };

    conversation.mensagens.push(novaMensagemUsuario);

    // 4. SISTEMA DE MENU - Processar mensagem baseado no estado
    let respostaChatbot: string;

    // Se usuário digitou "0", sempre volta ao menu principal
    if (mensagemDoUsuario.trim() === '0') {
      conversation.menu_state = 'menu';
      respostaChatbot = this.getMainMenu();
    }
    // Se conversa nova ou estado é menu, mostrar menu principal
    else if (!conversation.menu_state || conversation.menu_state === 'menu' || conversation.mensagens.length === 1) {
      // Se é uma conversa que foi reiniciada por inatividade, mostrar mensagem informativa
      if (conversation.mensagens.length === 1) {
        const isFirstEverMessage = !conversationId; // Se não tem conversationId, é realmente primeira vez
        if (!isFirstEverMessage) {
          respostaChatbot = `⏰ Sua sessão anterior foi finalizada por inatividade (10 minutos).

${this.getMainMenu()}`;
        } else {
          respostaChatbot = this.processMenuSelection(mensagemDoUsuario, conversation);
        }
      } else {
        respostaChatbot = this.processMenuSelection(mensagemDoUsuario, conversation);
      }
    }
    // Se está no modo IA, processar com IA
    else if (conversation.menu_state === 'ia_mode') {
      respostaChatbot = await this.processIAMode(mensagemDoUsuario, conversation);
    }
    // Se está em outros modos (agendar/autorizar)
    else {
      respostaChatbot = this.processOtherMenus(mensagemDoUsuario, conversation);
    }

    // 5. Adicionar resposta do chatbot
    const novaMensagemChatbot: Message = {
      remetente: 'chatbot',
      texto: respostaChatbot,
      data_hora: new Date()
    };

    conversation.mensagens.push(novaMensagemChatbot);
    conversation.data_hora_ultima_mensagem = new Date();

    // 6. Salvar conversa no banco de dados (sem o menu_state)
    if (this.databaseService) {
      try {
        const conversationToSave = { ...conversation };
        delete conversationToSave.menu_state; // Remove estado do menu antes de salvar
        conversation = await this.databaseService.saveConversation(conversationToSave);
        conversation.menu_state = conversation.menu_state; // Restaura estado na memória
        console.log(`[ChatService] Conversa salva no banco: ${conversation.id_conversa}`);
      } catch (error) {
        console.error('[ChatService] Erro ao salvar conversa:', error);
        // Continua mesmo se falhar ao salvar
      }
    }

    return {
      resposta: respostaChatbot,
      conversation: conversation
    };
  }

  /**
   * Método simples para compatibilidade (sem salvar no banco)
   */
  public async processUserMessageSimple(mensagemDoUsuario: string, historicoMensagens?: Message[]): Promise<string> {
    console.log(`[ChatService] Processando mensagem simples: "${mensagemDoUsuario}"`);
    
    // Obter resposta da IA incluindo o histórico da conversa (se fornecido)
    const iaResponseText = await this.iaService.conversar(mensagemDoUsuario, historicoMensagens);

    return iaResponseText;
  }

  // =============================================
  // SISTEMA DE MENU - MÉTODOS PRIVADOS
  // =============================================

  /**
   * Retorna o menu principal
   */
  private getMainMenu(): string {
    return `Olá! Como posso ajudá-lo hoje?

1. Tirar dúvidas (Com IA)
2. Agendar consulta
3. Autorizar exame

Digite o número da opção desejada ou 0 para voltar ao menu.

ℹ️ Sua sessão será finalizada automaticamente após 10 minutos de inatividade.`;
  }

  /**
   * Processa seleção do menu principal
   */
  private processMenuSelection(mensagemDoUsuario: string, conversation: Conversation): string {
    const opcao = mensagemDoUsuario.trim();

    switch (opcao) {
      case '1':
        conversation.menu_state = 'ia_mode';
        return `🤖 Modo IA ativado! Agora você pode fazer perguntas e eu responderei com inteligência artificial.

Você pode digitar qualquer dúvida médica ou digite 0 para voltar ao menu principal.`;

      case '2':
        conversation.menu_state = 'agendar_consulta';
        return `📅 Agendamento de Consulta

Em breve você será direcionado para o sistema de agendamento de consultas.

Digite 0 para voltar ao menu principal.`;

      case '3':
        conversation.menu_state = 'autorizar_exame';
        return `📋 Autorização de Exame

Em breve você será direcionado para o sistema de autorização de exames.

Digite 0 para voltar ao menu principal.`;

      default:
        // Opção inválida, mostra menu novamente
        return `❌ Opção inválida. Por favor, escolha uma das opções abaixo:

${this.getMainMenu()}`;
    }
  }

  /**
   * Processa mensagens no modo IA
   */
  private async processIAMode(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    console.log('[ChatService] Processando no modo IA');
    
    try {
      // Obter resposta da IA usando todo o histórico (exceto mensagens do menu)
      const mensagensParaIA = this.filterMessagesForIA(conversation.mensagens);
      const iaResponseText = await this.iaService.conversar(mensagemDoUsuario, mensagensParaIA);
      
      // Adiciona instrução para voltar ao menu
      return `${iaResponseText}

---
💡 Digite 0 a qualquer momento para voltar ao menu principal.`;

    } catch (error) {
      console.error('[ChatService] Erro ao processar IA:', error);
      conversation.menu_state = 'menu';
      return `❌ Desculpe, ocorreu um erro ao processar sua pergunta. Retornando ao menu principal.

${this.getMainMenu()}`;
    }
  }

  /**
   * Processa outros menus (agendar consulta, autorizar exame)
   */
  private processOtherMenus(mensagemDoUsuario: string, conversation: Conversation): string {
    // Por enquanto, qualquer mensagem que não seja "0" mantém na mesma tela
    if (conversation.menu_state === 'agendar_consulta') {
      return `📅 Você está no sistema de agendamento de consultas.

Funcionalidade em desenvolvimento. 

Digite 0 para voltar ao menu principal.`;
    } else if (conversation.menu_state === 'autorizar_exame') {
      return `📋 Você está no sistema de autorização de exames.

Funcionalidade em desenvolvimento.

Digite 0 para voltar ao menu principal.`;
    }

    // Fallback - volta ao menu
    conversation.menu_state = 'menu';
    return this.getMainMenu();
  }

  /**
   * Filtra mensagens para enviar para a IA (remove mensagens do sistema de menu)
   */
  private filterMessagesForIA(mensagens: Message[]): Message[] {
    return mensagens.filter(msg => {
      // Remove mensagens do menu principal e instruções de sistema
      if (msg.remetente === 'chatbot') {
        const texto = msg.texto.toLowerCase();
        return !texto.includes('como posso ajudá-lo hoje') && 
               !texto.includes('modo ia ativado') &&
               !texto.includes('agendamento de consulta') &&
               !texto.includes('autorização de exame') &&
               !texto.includes('opção inválida');
      }
      // Remove números de opção do menu (1, 2, 3, 0)
      if (msg.remetente === 'usuario') {
        const texto = msg.texto.trim();
        return !['0', '1', '2', '3'].includes(texto);
      }
      return true;
    });
  }
}