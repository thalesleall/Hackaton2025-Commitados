// chat.service.ts

import { IaService } from './IA.service';
import { DatabaseService } from './database.service';
import { AutorizacaoService } from './autorizacao.service';
import { AgendamentoSimplesService, AgendamentoStep } from './agendamento-simples.service';
import { Message, Conversation } from '../models/conversation.model';

export class ChatService {
  private autorizacaoService: AutorizacaoService;
  private agendamentoService: AgendamentoSimplesService;

  constructor(
    private iaService: IaService,
    private databaseService?: DatabaseService
  ) {
    this.autorizacaoService = new AutorizacaoService();
    this.agendamentoService = new AgendamentoSimplesService();
    console.log('ChatService inicializado com serviços de autorização e agendamento.');
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
      } else if (conversation) {
        // IMPORTANTE: Conversas vindas do banco não têm menu_state, definir com base no contexto
        conversation.menu_state = this.determineMenuState(conversation);
        console.log(`[ChatService] Conversa carregada do banco com estado: ${conversation.menu_state}`);
      }
    } else if (this.databaseService) {
      // Buscar conversa mais recente do usuário
      conversation = await this.databaseService.findLatestConversationByUserId(idUsuario);
      
      // Verificar se a conversa está inativa (mais de 10 minutos)
      if (conversation && this.databaseService.isConversationInactive(conversation)) {
        console.log(`[ChatService] Última conversa do usuário ${idUsuario} inativa há mais de 10 minutos. Iniciando nova conversa.`);
        conversation = null; // Força criação de nova conversa
      } else if (conversation) {
        // IMPORTANTE: Conversas vindas do banco não têm menu_state, definir com base no contexto
        conversation.menu_state = this.determineMenuState(conversation);
        console.log(`[ChatService] Conversa recente carregada com estado: ${conversation.menu_state}`);
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

    // 4. SISTEMA DE MENU - Processar mensagem baseado no estado atual
    let respostaChatbot: string;
    
    console.log(`[ChatService] Estado atual: ${conversation.menu_state}, Mensagem: "${mensagemDoUsuario}", Total mensagens: ${conversation.mensagens.length}`);

    // PRIORIDADE 1: Comando "0" sempre volta ao menu principal
    if (mensagemDoUsuario.trim() === '0') {
      console.log('[ChatService] Comando "0" detectado - voltando ao menu');
      conversation.menu_state = 'menu';
      respostaChatbot = this.getMainMenu();
    }
    // PRIORIDADE 2: Modo IA
    else if (conversation.menu_state === 'ia_mode') {
      console.log('[ChatService] Processando no modo IA');
      respostaChatbot = await this.processIAMode(mensagemDoUsuario, conversation);
    }
    // PRIORIDADE 3: Agendamento
    else if (conversation.menu_state === 'agendamento') {
      console.log('[ChatService] Processando agendamento');
      respostaChatbot = await this.processAgendamento(mensagemDoUsuario, conversation);
    }
    // PRIORIDADE 4: Outros menus (ex: autorização de exame)
    else if (conversation.menu_state === 'autorizar_exame') {
      console.log('[ChatService] Processando autorização de exame');
      respostaChatbot = await this.processOtherMenus(mensagemDoUsuario, conversation);
    }
    // PRIORIDADE 5: Menu principal (estado 'menu' ou novo)
    else if (conversation.menu_state === 'menu' || !conversation.menu_state) {
      console.log('[ChatService] Processando seleção do menu principal');
      
      // Verificar se é uma conversa reiniciada por inatividade
      const isResumedConversation = conversationId && conversation.mensagens.length === 1;
      
      if (isResumedConversation) {
        respostaChatbot = `⏰ Sua sessão anterior foi finalizada por inatividade (10 minutos).

${this.getMainMenu()}`;
        // Não processar a mensagem como seleção de menu neste caso
      } else {
        // Verificar se é a primeira mensagem do usuário
        const isFirstMessage = conversation.mensagens.length === 1; // Só tem a mensagem atual do usuário
        
        if (isFirstMessage) {
          // Primeira mensagem - mostrar greeting personalizado
          respostaChatbot = this.getWelcomeMessage();
        } else {
          // Processar normalmente como seleção do menu
          respostaChatbot = await this.processMenuSelection(mensagemDoUsuario, conversation);
        }
      }
    }
    // FALLBACK: Estado desconhecido - volta ao menu
    else {
      console.log(`[ChatService] Estado desconhecido: ${conversation.menu_state} - voltando ao menu`);
      conversation.menu_state = 'menu';
      respostaChatbot = this.getMainMenu();
    }

    // 5. Adicionar resposta do chatbot
    const novaMensagemChatbot: Message = {
      remetente: 'chatbot',
      texto: respostaChatbot,
      data_hora: new Date()
    };

    conversation.mensagens.push(novaMensagemChatbot);
    conversation.data_hora_ultima_mensagem = new Date();

    // 6. Salvar conversa no banco de dados (preservar menu_state na memória)
    if (this.databaseService) {
      try {
        // Preservar o estado do menu antes de salvar
        const currentMenuState = conversation.menu_state;
        
        const conversationToSave = { ...conversation };
        delete conversationToSave.menu_state; // Remove estado do menu antes de salvar no banco
        
        const savedConversation = await this.databaseService.saveConversation(conversationToSave);
        
        // Restaurar o estado do menu após salvar
        savedConversation.menu_state = currentMenuState;
        conversation = savedConversation;
        
        console.log(`[ChatService] Conversa salva no banco: ${conversation.id_conversa} (estado: ${currentMenuState})`);
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

  /**
   * Processa arquivo de autorização de exame
   */
  public async processarAutorizacaoExame(filePath: string, lang?: string, dpi?: number): Promise<string> {
    try {
      console.log(`[ChatService] Processando autorização de exame: ${filePath}`);
      
      const resultado = await this.autorizacaoService.processarExame(filePath, lang, dpi);
      
      if (!resultado) {
        return `❌ **Não foi possível identificar o exame**

Não conseguimos identificar nenhum procedimento no documento enviado. 

Por favor:
- Verifique se o arquivo é um pedido médico válido
- Certifique-se de que o texto está legível
- Tente enviar um arquivo de melhor qualidade

Digite 0 para voltar ao menu principal.`;
      }

      let mensagem = `✅ **Autorização de Exame Processada**

📋 **Exame:** ${resultado.exame}
⏱️ **Auditoria:** ${resultado.auditoria}`;

      // Adicionar data de resposta se houver auditoria
      if (resultado.dataResposta) {
        mensagem += `
📅 **Resposta prevista para:** ${resultado.dataResposta}`;
      }

      mensagem += `

Digite 0 para voltar ao menu principal.`;

      return mensagem;

    } catch (error: any) {
      console.error('[ChatService] Erro ao processar autorização:', error);
      
      return `❌ **Erro ao processar o arquivo**

Ocorreu um erro ao analisar o documento: ${error.message}

Por favor:
- Verifique se o arquivo é um PDF válido
- Tente enviar o arquivo novamente
- Certifique-se de que o arquivo não está corrompido

Digite 0 para voltar ao menu principal.`;
    }
  }

  // =============================================
  // SISTEMA DE MENU - MÉTODOS PRIVADOS
  // =============================================

  /**
   * Retorna mensagem de boas-vindas para primeira interação
   */
  private getWelcomeMessage(): string {
    return `👋 Bem-vindo(a) ao atendimento da nossa clínica!

Sou seu assistente virtual e estou aqui para ajudá-lo(a). Como posso ajudá-lo hoje?

1. Tirar dúvidas (Com IA)
2. Agendar consulta
3. Autorizar exame

Digite o número da opção desejada ou 0 para voltar ao menu.

ℹ️ Sua sessão será finalizada automaticamente após 10 minutos de inatividade.`;
  }

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
  private async processMenuSelection(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    const opcao = mensagemDoUsuario.trim();
    console.log(`[ChatService] Processando opção do menu: "${opcao}"`);

    switch (opcao) {
      case '1':
        console.log('[ChatService] Ativando modo IA');
        conversation.menu_state = 'ia_mode';
        return `🤖 Modo IA ativado! Agora você pode fazer perguntas e eu responderei com inteligência artificial.

Digite sua pergunta ou 0 para voltar ao menu.`;
      
      case '2':
        console.log('[ChatService] Ativando modo agendamento');
        conversation.menu_state = 'agendamento';
        conversation.agendamento_step = { step: 'ESPECIALIDADE' };
        
        // Iniciar fluxo de agendamento
        const iniciarAgendamento = await this.agendamentoService.processarAgendamento(
          conversation.agendamento_step, 
          ''
        );
        
        conversation.agendamento_step = iniciarAgendamento.nextStep;
        
        return `${iniciarAgendamento.message}

---
💡 Digite 0 a qualquer momento para voltar ao menu principal.`;

      case '3':
        console.log('[ChatService] Ativando modo autorização de exame');
        conversation.menu_state = 'autorizar_exame';
        return `📋 Modo de autorização de exames ativado.

Para iniciar, por favor, envie uma foto do seu pedido de exame.`;

      default:
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
   * Processa agendamento de consulta
   */
  private async processAgendamento(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    console.log('[ChatService] Processando agendamento');
    
    try {
      // Verificar se há step de agendamento
      if (!conversation.agendamento_step) {
        conversation.agendamento_step = { step: 'ESPECIALIDADE' };
      }

      // Processar com o serviço de agendamento
      const resultado = await this.agendamentoService.processarAgendamento(
        conversation.agendamento_step,
        mensagemDoUsuario
      );

      // Atualizar o step na conversa
      conversation.agendamento_step = resultado.nextStep;

      // Se completou o agendamento, voltar ao menu
      if (resultado.message.includes('AGENDAMENTO CONFIRMADO') || resultado.message.includes('Agendamento cancelado')) {
        conversation.menu_state = 'menu';
        conversation.agendamento_step = undefined;
      }

      return `${resultado.message}

---
💡 Digite 0 a qualquer momento para voltar ao menu principal.`;

    } catch (error) {
      console.error('[ChatService] Erro ao processar agendamento:', error);
      conversation.menu_state = 'menu';
      conversation.agendamento_step = undefined;
      return `❌ Desculpe, ocorreu um erro ao processar o agendamento. Retornando ao menu principal.

${this.getMainMenu()}`;
    }
  }

  /**
   * Processa outros menus (autorizar exame)
   */
  private async processOtherMenus(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    if (conversation.menu_state === 'autorizar_exame') {
      return `📋 **Sistema de Autorização de Exames**

Para analisar seu pedido de exame, por favor envie o arquivo PDF do pedido médico.

💡 **Como fazer:**
1. Clique no ícone de anexo (📎)
2. Selecione o arquivo PDF do seu pedido
3. Aguarde o processamento

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

  private determineMenuState(conversation: Conversation): 'menu' | 'ia_mode' | 'autorizar_exame' | 'agendamento' {
    const mensagens = conversation.mensagens || [];
    
    // Se não há mensagens, inicia no menu
    if (mensagens.length === 0) {
      return 'menu';
    }

    // Buscar a última resposta do chatbot para determinar o estado
    const ultimasRespostasChatbot = mensagens
      .filter(msg => msg.remetente === 'chatbot')
      .slice(-3); // Últimas 3 mensagens do chatbot para ter mais contexto

    for (const msg of ultimasRespostasChatbot.reverse()) {
      const texto = msg.texto.toLowerCase();
      
      // 1. MODO IA
      if (texto.includes('modo ia ativado') || 
          (texto.includes('digite 0 a qualquer momento para voltar ao menu') && !texto.includes('como posso ajudá-lo hoje'))) {
        console.log('[ChatService] Estado detectado: ia_mode');
        return 'ia_mode';
      }
      
      // 2. AGENDAMENTO
      if (texto.includes('agendamento de consulta') || 
          texto.includes('especialidades disponíveis') ||
          texto.includes('médicos disponíveis') ||
          texto.includes('horários disponíveis') ||
          texto.includes('dados do paciente') ||
          texto.includes('confirmação do agendamento')) {
        console.log('[ChatService] Estado detectado: agendamento');
        return 'agendamento';
      }
      
      // 3. AUTORIZAÇÃO
      if (texto.includes('autorização de exame')) {
        console.log('[ChatService] Estado detectado: autorizar_exame');
        return 'autorizar_exame';
      }
      
      // 4. MENU PRINCIPAL
      if (texto.includes('como posso ajudá-lo hoje') || 
          texto.includes('opção inválida') ||
          texto.includes('digite o número da opção desejada')) {
        console.log('[ChatService] Estado detectado: menu');
        return 'menu';
      }
    }

    // Default: volta ao menu se não conseguiu determinar
    console.log('[ChatService] Não foi possível determinar estado do menu, voltando ao menu principal');
    return 'menu';
  }
}