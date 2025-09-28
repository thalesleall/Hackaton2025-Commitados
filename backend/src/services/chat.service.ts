// chat.service.ts

import { IaService } from './IA.service';
import { DatabaseService } from './database.service';
import { AgendamentoService } from './agendamento.service';
import { Message, Conversation } from '../models/conversation.model';

export class ChatService {
  private agendamentoService: AgendamentoService;

  constructor(
    private iaService: IaService,
    private databaseService?: DatabaseService
  ) {
    this.agendamentoService = new AgendamentoService();
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
        menu_state: 'menu', // Sempre inicia no menu
        agendamento_temp: {} // Dados temporários do agendamento
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
    // PRIORIDADE 2: Estados específicos já definidos
    else if (conversation.menu_state === 'ia_mode') {
      console.log('[ChatService] Processando no modo IA');
      respostaChatbot = await this.processIAMode(mensagemDoUsuario, conversation);
    }
    else if (conversation.menu_state === 'agendar_consulta' || 
             conversation.menu_state === 'agendar_especialidade' ||
             conversation.menu_state === 'agendar_medico' ||
             conversation.menu_state === 'agendar_data' ||
             conversation.menu_state === 'agendar_dados' ||
             conversation.menu_state === 'agendar_confirmacao') {
      console.log('[ChatService] Processando agendamento de consulta');
      respostaChatbot = await this.processAgendamento(mensagemDoUsuario, conversation);
    }
    else if (conversation.menu_state === 'autorizar_exame') {
      console.log('[ChatService] Processando autorização de exame');
      respostaChatbot = this.processOtherMenus(mensagemDoUsuario, conversation);
    }
    // PRIORIDADE 3: Menu principal (estado 'menu' ou novo)
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

Você pode digitar qualquer dúvida médica ou digite 0 para voltar ao menu principal.`;

      case '2':
        console.log('[ChatService] Ativando modo agendamento');
        conversation.menu_state = 'agendar_consulta';
        // Executar imediatamente o carregamento das especialidades
        return await this.iniciarAgendamento(conversation);

      case '3':
        console.log('[ChatService] Ativando modo autorização');
        conversation.menu_state = 'autorizar_exame';
        return `📋 Autorização de Exame

Em breve você será direcionado para o sistema de autorização de exames.

Digite 0 para voltar ao menu principal.`;

      default:
        // Opção inválida, mostra menu novamente
        console.log(`[ChatService] Opção inválida: "${opcao}"`);
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
   * Processa sistema de agendamento completo
   */
  private async processAgendamento(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    try {
      // Inicializar dados temporários se não existirem
      if (!conversation.agendamento_temp) {
        conversation.agendamento_temp = {};
      }

      switch (conversation.menu_state) {
        case 'agendar_consulta':
          return await this.iniciarAgendamento(conversation);
          
        case 'agendar_especialidade':
          return await this.processarEspecialidade(mensagemDoUsuario, conversation);
          
        case 'agendar_medico':
          return await this.processarMedico(mensagemDoUsuario, conversation);
          
        case 'agendar_data':
          return await this.processarData(mensagemDoUsuario, conversation);
          
        case 'agendar_dados':
          return await this.processarDadosPaciente(mensagemDoUsuario, conversation);
          
        case 'agendar_confirmacao':
          return await this.processarConfirmacao(mensagemDoUsuario, conversation);
          
        default:
          conversation.menu_state = 'menu';
          return this.getMainMenu();
      }
    } catch (error) {
      console.error('[ChatService] Erro no agendamento:', error);
      conversation.menu_state = 'menu';
      return `❌ Ocorreu um erro no sistema de agendamento. Retornando ao menu principal.

${this.getMainMenu()}`;
    }
  }

  /**
   * Processa outros menus (autorizar exame)
   */
  private processOtherMenus(mensagemDoUsuario: string, conversation: Conversation): string {
    if (conversation.menu_state === 'autorizar_exame') {
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

  /**
   * Determina o estado do menu com base no histórico da conversa
   */
  private determineMenuState(conversation: Conversation): 'menu' | 'ia_mode' | 'agendar_consulta' | 'autorizar_exame' | 
              'agendar_especialidade' | 'agendar_medico' | 'agendar_data' | 
              'agendar_dados' | 'agendar_confirmacao' {
    const mensagens = conversation.mensagens || [];
    
    // Se não há mensagens, inicia no menu
    if (mensagens.length === 0) {
      return 'menu';
    }

    // Buscar a última resposta do chatbot para determinar o estado
    const ultimasRespostasChatbot = mensagens
      .filter(msg => msg.remetente === 'chatbot')
      .slice(-5); // Últimas 5 mensagens do chatbot para ter mais contexto

    for (const msg of ultimasRespostasChatbot.reverse()) {
      const texto = msg.texto.toLowerCase();
      
      // Verificar se ativou modo IA (buscar por indicadores específicos)
      if (texto.includes('modo ia ativado') || 
          texto.includes('🤖') || 
          (texto.includes('digite 0 a qualquer momento para voltar ao menu') && !texto.includes('como posso ajudá-lo hoje'))) {
        console.log('[ChatService] Estado detectado: ia_mode');
        return 'ia_mode';
      }
      
      // Verificar se está em agendamento
      if (texto.includes('agendamento de consulta') || texto.includes('especialidades disponíveis') || 
          texto.includes('médicos disponíveis') || texto.includes('datas e horários disponíveis') ||
          texto.includes('dados do paciente') || texto.includes('confirmação do agendamento')) {
        
        if (texto.includes('especialidades disponíveis')) {
          console.log('[ChatService] Estado detectado: agendar_especialidade');
          return 'agendar_especialidade';
        } else if (texto.includes('médicos disponíveis')) {
          console.log('[ChatService] Estado detectado: agendar_medico');
          return 'agendar_medico';
        } else if (texto.includes('datas e horários disponíveis')) {
          console.log('[ChatService] Estado detectado: agendar_data');
          return 'agendar_data';
        } else if (texto.includes('dados do paciente') || texto.includes('nome completo')) {
          console.log('[ChatService] Estado detectado: agendar_dados');
          return 'agendar_dados';
        } else if (texto.includes('confirmação do agendamento')) {
          console.log('[ChatService] Estado detectado: agendar_confirmacao');
          return 'agendar_confirmacao';
        } else {
          console.log('[ChatService] Estado detectado: agendar_consulta');
          return 'agendar_consulta';
        }
      }
      
      // Verificar se está em autorização
      if (texto.includes('autorização de exame') || 
          (texto.includes('📋') && texto.includes('funcionalidade em desenvolvimento'))) {
        console.log('[ChatService] Estado detectado: autorizar_exame');
        return 'autorizar_exame';
      }
      
      // Se menciona menu principal ou opção inválida, está no menu
      if (texto.includes('como posso ajudá-lo hoje') || 
          texto.includes('opção inválida') ||
          texto.includes('digite o número da opção desejada')) {
        console.log('[ChatService] Estado detectado: menu');
        return 'menu';
      }
    }

    // Se não conseguiu determinar, analisa a última mensagem do usuário
    const ultimaMsgUsuario = mensagens
      .filter(msg => msg.remetente === 'usuario')
      .slice(-1)[0];

    if (ultimaMsgUsuario) {
      const userInput = ultimaMsgUsuario.texto.trim();
      
      // Se a última entrada foi uma opção de menu, mas ainda não foi processada
      if (['1', '2', '3'].includes(userInput)) {
        return 'menu'; // Ainda processando seleção
      }
    }

    // Default: volta ao menu se não conseguiu determinar
    console.log('[ChatService] Não foi possível determinar estado do menu, voltando ao menu principal');
    return 'menu';
  }

  // =============================================
  // SISTEMA DE AGENDAMENTO - MÉTODOS PRIVADOS
  // =============================================

  /**
   * Inicia o processo de agendamento
   */
  private async iniciarAgendamento(conversation: Conversation): Promise<string> {
    try {
      const especialidades = await this.agendamentoService.getEspecialidades();
      
      if (especialidades.length === 0) {
        return `📅 Desculpe, não há especialidades disponíveis no momento.

Digite 0 para voltar ao menu principal.`;
      }

      conversation.menu_state = 'agendar_especialidade';
      
      let mensagem = `🏥 **AGENDAMENTO DE CONSULTA**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ **Especialidades Disponíveis:**

`;

      especialidades.forEach((esp, index) => {
        const cidades = esp.cidades.join(' • ');
        mensagem += `${index + 1}️⃣ **${esp.especialidade}**\n`;
        mensagem += `   📍 ${cidades}\n`;
        mensagem += `   👨‍⚕️ ${esp.total_medicos} médico${esp.total_medicos > 1 ? 's' : ''} disponível${esp.total_medicos > 1 ? 'eis' : ''}\n\n`;
      });

      mensagem += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔢 Digite o **número** da especialidade desejada
🔄 Digite **0** para voltar ao menu principal`;

      return mensagem;

    } catch (error) {
      console.error('[ChatService] Erro ao iniciar agendamento:', error);
      return `❌ Erro ao carregar especialidades. Tente novamente.

Digite 0 para voltar ao menu principal.`;
    }
  }

  /**
   * Processa seleção de especialidade
   */
  private async processarEspecialidade(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    try {
      const opcao = parseInt(mensagemDoUsuario.trim());
      
      if (isNaN(opcao)) {
        return `❌ **Opção inválida!**

🔢 Por favor, digite o **número** da especialidade desejada.
🔄 Digite **0** para voltar ao menu principal.`;
      }

      const especialidades = await this.agendamentoService.getEspecialidades();
      
      if (opcao < 1 || opcao > especialidades.length) {
        return `❌ **Número inválido!**

🔢 Digite um número entre **1** e **${especialidades.length}**.
🔄 Digite **0** para voltar ao menu principal.`;
      }

      const especialidadeSelecionada = especialidades[opcao - 1].especialidade;
      conversation.agendamento_temp!.especialidade = especialidadeSelecionada;

      const medicos = await this.agendamentoService.getMedicosPorEspecialidade(especialidadeSelecionada);
      
      if (medicos.length === 0) {
        return `📅 Não há médicos disponíveis para ${especialidadeSelecionada}.

Digite 0 para voltar ao menu principal.`;
      }

      conversation.menu_state = 'agendar_medico';
      
      let mensagem = `🩺 **${especialidadeSelecionada.toUpperCase()}**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍⚕️ **Médicos Disponíveis:**

`;

      medicos.forEach((medico, index) => {
        mensagem += `${index + 1}️⃣ **Dr(a). ${medico.nome}**\n`;
        mensagem += `   📍 ${medico.cidade}\n\n`;
      });

      mensagem += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔢 Digite o **número** do médico desejado
🔄 Digite **0** para voltar ao menu principal`;

      return mensagem;

    } catch (error) {
      console.error('[ChatService] Erro ao processar especialidade:', error);
      return `❌ Erro ao carregar médicos. Tente novamente.

Digite 0 para voltar ao menu principal.`;
    }
  }

  /**
   * Processa seleção de médico
   */
  private async processarMedico(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    try {
      const opcao = parseInt(mensagemDoUsuario.trim());
      
      if (isNaN(opcao)) {
        return `❌ Por favor, digite o número do médico desejado.

Digite 0 para voltar ao menu principal.`;
      }

      const medicos = await this.agendamentoService.getMedicosPorEspecialidade(
        conversation.agendamento_temp!.especialidade!
      );
      
      if (opcao < 1 || opcao > medicos.length) {
        return `❌ Opção inválida. Digite um número entre 1 e ${medicos.length}.

Digite 0 para voltar ao menu principal.`;
      }

      const medicoSelecionado = medicos[opcao - 1];
      conversation.agendamento_temp!.medico_id = medicoSelecionado.id;
      conversation.agendamento_temp!.medico_nome = medicoSelecionado.nome;

      const horarios = await this.agendamentoService.getHorariosDisponiveis(medicoSelecionado.id);
      
      if (horarios.length === 0) {
        return `📅 **${medicoSelecionado.nome}** não possui horários disponíveis nos próximos 30 dias.

Tente escolher outro médico ou digite 0 para voltar ao menu principal.`;
      }

      conversation.menu_state = 'agendar_data';
      
      let mensagem = `📅 **${medicoSelecionado.nome.toUpperCase()}**
🩺 ${conversation.agendamento_temp!.especialidade} • 📍 ${medicoSelecionado.cidade}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏰ **Datas e Horários Disponíveis:**

`;

      // Agrupar por data
      const horariosPorData = new Map<string, typeof horarios>();
      horarios.forEach(h => {
        if (!horariosPorData.has(h.data)) {
          horariosPorData.set(h.data, []);
        }
        horariosPorData.get(h.data)!.push(h);
      });

      let contador = 1;
      const datasDisponiveis = Array.from(horariosPorData.entries()).slice(0, 10); // Mostrar apenas 10 primeiras datas

      datasDisponiveis.forEach(([data, horariosData]) => {
        const primeiroHorario = horariosData[0];
        const todosHorarios = horariosData.map(h => this.agendamentoService.formatarHorario(h.horario_inicio)).join(' • ');
        mensagem += `${contador}️⃣ **${primeiroHorario.data_formatada}**\n`;
        mensagem += `   🕐 ${todosHorarios}\n\n`;
        contador++;
      });

      mensagem += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔢 Digite o **número** da data desejada
🔄 Digite **0** para voltar ao menu principal`;

      return mensagem;

    } catch (error) {
      console.error('[ChatService] Erro ao processar médico:', error);
      return `❌ Erro ao carregar horários. Tente novamente.

Digite 0 para voltar ao menu principal.`;
    }
  }

  /**
   * Processa seleção de data/horário
   */
  private async processarData(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    try {
      const opcao = parseInt(mensagemDoUsuario.trim());
      
      if (isNaN(opcao)) {
        return `❌ Por favor, digite o número da data desejada.

Digite 0 para voltar ao menu principal.`;
      }

      const horarios = await this.agendamentoService.getHorariosDisponiveis(
        conversation.agendamento_temp!.medico_id!
      );

      // Agrupar por data (mesma lógica do método anterior)
      const horariosPorData = new Map<string, typeof horarios>();
      horarios.forEach(h => {
        if (!horariosPorData.has(h.data)) {
          horariosPorData.set(h.data, []);
        }
        horariosPorData.get(h.data)!.push(h);
      });

      const datasDisponiveis = Array.from(horariosPorData.entries()).slice(0, 10);
      
      if (opcao < 1 || opcao > datasDisponiveis.length) {
        return `❌ Opção inválida. Digite um número entre 1 e ${datasDisponiveis.length}.

Digite 0 para voltar ao menu principal.`;
      }

      const [dataSelecionada, horariosData] = datasDisponiveis[opcao - 1];
      
      // Se há apenas um horário, seleciona automaticamente
      if (horariosData.length === 1) {
        const horario = horariosData[0];
        conversation.agendamento_temp!.agenda_id = horario.agenda_id;
        conversation.agendamento_temp!.data_selecionada = dataSelecionada;
        conversation.agendamento_temp!.horario_selecionado = horario.horario_inicio;
        
        conversation.menu_state = 'agendar_dados';
        return this.solicitarDadosPaciente(conversation);
      }

      // Se há múltiplos horários, deixar o usuário escolher
      conversation.agendamento_temp!.data_selecionada = dataSelecionada;
      
      let mensagem = `📅 **${horariosData[0].data_formatada}**

Escolha um horário:

`;

      horariosData.forEach((horario, index) => {
        const horarioFormatado = this.agendamentoService.formatarHorario(horario.horario_inicio);
        mensagem += `${index + 1}. ${horarioFormatado}\n`;
      });

      mensagem += `\nDigite o número do horário desejado ou 0 para voltar ao menu principal.`;

      return mensagem;

    } catch (error) {
      console.error('[ChatService] Erro ao processar data:', error);
      return `❌ Erro ao processar data. Tente novamente.

Digite 0 para voltar ao menu principal.`;
    }
  }

  /**
   * Solicita dados do paciente
   */
  private solicitarDadosPaciente(conversation: Conversation): string {
    conversation.menu_state = 'agendar_dados';
    
    return `📝 **DADOS DO PACIENTE**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✨ Estamos quase finalizando seu agendamento!

Para concluir, preciso de algumas informações:

👤 Digite seu **nome completo**:`;
  }

  /**
   * Processa dados do paciente
   */
  private async processarDadosPaciente(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    const input = mensagemDoUsuario.trim();

    if (!conversation.agendamento_temp!.paciente_nome) {
      // Primeira etapa: receber nome
      if (input.length < 3) {
        return `❌ **Nome muito curto!**

👤 Digite seu **nome completo** (mínimo 3 caracteres).`;
      }

      conversation.agendamento_temp!.paciente_nome = input;
      return `📞 **Perfeito, ${input}!**

Agora digite seu **telefone com DDD**:

💡 Exemplo: (11) 99999-9999`;
    } else {
      // Segunda etapa: receber telefone
      const telefoneRegex = /^\(?[1-9]{2}\)?\s?[0-9]{4,5}-?[0-9]{4}$/;
      
      if (!telefoneRegex.test(input.replace(/\s+/g, ''))) {
        return `❌ **Telefone inválido!**

📞 Use o formato correto: **(11) 99999-9999**

Digite novamente:`;
      }

      conversation.agendamento_temp!.paciente_telefone = input;
      conversation.menu_state = 'agendar_confirmacao';
      
      return this.mostrarResumoAgendamento(conversation);
    }
  }

  /**
   * Mostra resumo do agendamento para confirmação
   */
  private mostrarResumoAgendamento(conversation: Conversation): string {
    const dados = conversation.agendamento_temp!;
    
    return `📋 **CONFIRMAÇÃO DO AGENDAMENTO**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 **Dados da Consulta:**
👨‍⚕️ **Médico:** ${dados.medico_nome}
🏥 **Especialidade:** ${dados.especialidade}
📅 **Data:** ${dados.data_selecionada}
⏰ **Horário:** ${this.agendamentoService.formatarHorario(dados.horario_selecionado!)}

👤 **Dados do Paciente:**
� **Nome:** ${dados.paciente_nome}
📞 **Telefone:** ${dados.paciente_telefone}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Para **CONFIRMAR**, digite: **CONFIRMAR**
❌ Para cancelar, digite: **0**

⚠️ **Importante:** Após confirmação, não será possível alterar os dados.`;
  }

  /**
   * Processa confirmação final
   */
  private async processarConfirmacao(mensagemDoUsuario: string, conversation: Conversation): Promise<string> {
    const input = mensagemDoUsuario.trim().toUpperCase();

    if (input !== 'CONFIRMAR') {
      return `❌ Para confirmar o agendamento, digite exatamente: **CONFIRMAR**
Para cancelar, digite: 0`;
    }

    try {
      const dados = conversation.agendamento_temp!;
      
      const protocolo = await this.agendamentoService.confirmarAgendamento(
        dados.agenda_id!,
        dados.paciente_nome!,
        dados.paciente_telefone!
      );

      // Limpar dados temporários
      conversation.agendamento_temp = {};
      conversation.menu_state = 'menu';

      return `🎉 **AGENDAMENTO CONFIRMADO COM SUCESSO!**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎫 **PROTOCOLO:** ${protocolo}

🩺 **Resumo da Consulta:**
👨‍⚕️ **Médico:** ${dados.medico_nome}
🏥 **Especialidade:** ${dados.especialidade}
📅 **Data:** ${dados.data_selecionada}
⏰ **Horário:** ${this.agendamentoService.formatarHorario(dados.horario_selecionado!)}

👤 **Paciente:**
� **Nome:** ${dados.paciente_nome}
📞 **Telefone:** ${dados.paciente_telefone}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️ **INSTRUÇÕES IMPORTANTES:**
• ⏰ Chegue com **15 minutos** de antecedência
• 🆔 Traga **documento com foto**
• 💾 **Guarde este protocolo:** ${protocolo}
• 📱 Em caso de dúvidas, entre em contato

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${this.getMainMenu()}`;

    } catch (error) {
      console.error('[ChatService] Erro ao confirmar agendamento:', error);
      
      // Limpar dados temporários mesmo em caso de erro
      conversation.agendamento_temp = {};
      conversation.menu_state = 'menu';
      
      return `❌ Erro ao confirmar agendamento. O horário pode ter sido ocupado por outro paciente.

Tente fazer um novo agendamento.

${this.getMainMenu()}`;
    }
  }
}