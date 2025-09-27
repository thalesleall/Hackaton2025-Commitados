import { supabase } from '../config/bd';
import { Conversation, Message, FluxoConversa, MenuOption, AutorizacaoExame, AgendamentoExame } from '../models/chat-menu.model';

export class MenuChatService {
  private readonly INACTIVITY_LIMIT_MS = 10 * 60 * 1000; // 10 minutos

  constructor() {
    console.log('MenuChatService inicializado.');
  }

  /**
   * Processa mensagem do usuário no sistema de menu
   * A primeira mensagem automaticamente inicia a conversa e mostra o menu
   */
  public async processarMensagem(idUsuario: string, mensagem: string): Promise<string> {
    try {
      // Buscar ou criar conversa
      let conversa = await this.buscarOuCriarConversa(idUsuario);
      
      // Garantir que mensagens é um array válido
      if (!Array.isArray(conversa.mensagens)) {
        conversa.mensagens = [];
      }
      
      // Verificar se é a primeira mensagem (conversa nova)
      const isPrimeiraMensagem = conversa.mensagens.length === 0;
      
      // Verificar se conversa expirou por inatividade
      const agora = new Date();
      const tempoDecorrido = agora.getTime() - conversa.data_hora_ultima_mensagem.getTime();
      
      if (tempoDecorrido > this.INACTIVITY_LIMIT_MS && conversa.status_conversa === 'aberta') {
        // Conversa expirou - reiniciar
        conversa = await this.reiniciarConversa(conversa);
      }
      
      // Se for primeira mensagem, sempre mostrar menu independente do conteúdo
      if (isPrimeiraMensagem) {
        // Adicionar mensagem do usuário
        conversa.mensagens.push({
          remetente: 'usuario',
          texto: mensagem,
          data_hora: agora
        });
        
        // Definir etapa inicial
        conversa.etapa_atual = 'menu_principal';
        
        // Mostrar menu de boas-vindas
        const resposta = this.exibirMenuPrincipal();
        
        // Adicionar resposta do sistema
        conversa.mensagens.push({
          remetente: 'sistema',
          texto: resposta,
          data_hora: new Date()
        });

        // Salvar conversa
        await this.salvarConversa(conversa);
        
        return resposta;
      }

      // Adicionar mensagem do usuário
      conversa.mensagens.push({
        remetente: 'usuario',
        texto: mensagem,
        data_hora: agora
      });

      // Processar mensagem baseado na etapa atual
      const resposta = await this.processarEtapaAtual(conversa, mensagem);

      // Adicionar resposta do sistema
      conversa.mensagens.push({
        remetente: 'sistema',
        texto: resposta,
        data_hora: new Date()
      });

      // Atualizar conversa no banco
      await this.salvarConversa(conversa);

      return resposta;

    } catch (error) {
      console.error('[MenuChatService] Erro ao processar mensagem:', error);
      return this.adicionarRodape('Desculpe, ocorreu um erro. Tente novamente.');
    }
  }

  /**
   * Processa a etapa atual da conversa
   */
  private async processarEtapaAtual(conversa: Conversation, mensagem: string): Promise<string> {
    const mensagemLower = mensagem.toLowerCase().trim();

    // Comandos globais para voltar ao menu
    if (mensagemLower === '0' || mensagemLower === 'menu' || mensagemLower === 'inicio') {
      conversa.etapa_atual = 'menu_principal';
      conversa.dados_temporarios = {};
      return this.exibirMenuPrincipal();
    }

    switch (conversa.etapa_atual) {
      case 'menu_principal':
        return await this.processarMenuPrincipal(conversa, mensagemLower);
      
      case 'autorizacao_cpf':
        return await this.processarAutorizacaoCPF(conversa, mensagemLower);
      
      case 'autorizacao_consultar':
        return await this.processarConsultaAutorizacao(conversa, mensagemLower);
      
      case 'agendamento_cpf':
        return await this.processarAgendamentoCPF(conversa, mensagemLower);
      
      case 'agendamento_tipo_exame':
        return await this.processarTipoExame(conversa, mensagemLower);
      
      case 'agendamento_horario':
        return await this.processarEscolhaHorario(conversa, mensagemLower);
      
      case 'agendamento_confirmacao':
        return await this.processarConfirmacaoAgendamento(conversa, mensagemLower);
      
      case 'duvidas':
        return await this.processarDuvidas(conversa, mensagem);
      
      default:
        conversa.etapa_atual = 'menu_principal';
        return this.exibirMenuPrincipal();
    }
  }

  /**
   * Adiciona rodapé padrão a todas as mensagens
   */
  private adicionarRodape(mensagem: string): string {
    return `${mensagem}

---
💡 Digite **0** a qualquer momento para voltar ao menu principal`;
  }

  /**
   * Exibe o menu principal
   */
  private exibirMenuPrincipal(): string {
    return `🏥 **Bem-vindo ao Atendimento Digital**

Escolha uma opção:

**1** - Autorizar Exames
**2** - Agendar Exames  
**3** - Tirar Dúvidas

Digite o número da opção desejada.

---
💡 Digite **0** a qualquer momento para voltar ao menu principal`;
  }

  /**
   * Processa seleção do menu principal
   */
  private async processarMenuPrincipal(conversa: Conversation, opcao: string): Promise<string> {
    switch (opcao) {
      case '1':
        conversa.tipo_conversa = 'autorizacao';
        conversa.etapa_atual = 'autorizacao_cpf';
        return this.adicionarRodape(`📋 **Autorização de Exames**

Para consultar suas autorizações, informe seu CPF (11 dígitos):`);

      case '2':
        conversa.tipo_conversa = 'agendamento';
        conversa.etapa_atual = 'agendamento_cpf';
        return this.adicionarRodape(`📅 **Agendamento de Exames**

Para agendar um exame, informe seu CPF (11 dígitos):`);

      case '3':
        conversa.tipo_conversa = 'duvidas';
        conversa.etapa_atual = 'duvidas';
        return this.adicionarRodape(`❓ **Assistente de Dúvidas**

Como posso ajudá-lo? Pode fazer qualquer pergunta sobre nossos serviços, procedimentos ou exames.`);

      default:
        return `❌ Opção inválida. Digite **1**, **2** ou **3**.

${this.exibirMenuPrincipal()}`;
    }
  }

  /**
   * Processa CPF para autorização
   */
  private async processarAutorizacaoCPF(conversa: Conversation, cpf: string): Promise<string> {
    // Validar CPF
    if (!/^\d{11}$/.test(cpf)) {
      return this.adicionarRodape(`❌ CPF inválido. Informe 11 dígitos sem pontos ou traços.

Exemplo: 12345678901`);
    }

    conversa.cpf_cliente = cpf;
    conversa.cliente_identificado = true;
    conversa.etapa_atual = 'autorizacao_consultar';

    // Buscar autorizações
    const { data: autorizacoes } = await supabase
      .from('autorizacao_exames')
      .select('*')
      .eq('cpf_paciente', cpf)
      .order('data_solicitacao', { ascending: false });

    if (!autorizacoes || autorizacoes.length === 0) {
      return this.adicionarRodape(`ℹ️ Nenhuma autorização encontrada para o CPF ${cpf}.`);
    }

    let resposta = `✅ **Autorizações encontradas para CPF ${cpf}:**\n\n`;
    
    autorizacoes.slice(0, 5).forEach((auth, index) => {
      const status = auth.status_autorizacao === 'autorizado' ? '✅' : 
                    auth.status_autorizacao === 'pendente' ? '⏳' : '❌';
      resposta += `**${index + 1}.** ${auth.nome_procedimento}\n`;
      resposta += `   Status: ${status} ${auth.status_autorizacao}\n`;
      resposta += `   Número: ${auth.numero_autorizacao}\n`;
      resposta += `   Data: ${new Date(auth.data_solicitacao).toLocaleDateString('pt-BR')}\n\n`;
    });

    resposta += `Digite o **número** de uma autorização para ver detalhes, ou **menu** para voltar.`;
    
    conversa.dados_temporarios = { autorizacoes };
    return resposta;
  }

  /**
   * Processa consulta de autorização específica
   */
  private async processarConsultaAutorizacao(conversa: Conversation, opcao: string): Promise<string> {
    const numero = parseInt(opcao);
    const autorizacoes = conversa.dados_temporarios.autorizacoes;

    if (isNaN(numero) || numero < 1 || numero > autorizacoes.length) {
      return this.adicionarRodape(`❌ Opção inválida. Digite um número de 1 a ${autorizacoes.length}.`);
    }

    const auth = autorizacoes[numero - 1];
    const statusIcon = auth.status_autorizacao === 'autorizado' ? '✅' : 
                      auth.status_autorizacao === 'pendente' ? '⏳' : '❌';

    return `📄 **Detalhes da Autorização**

**Procedimento:** ${auth.nome_procedimento}
**Número:** ${auth.numero_autorizacao}
**Status:** ${statusIcon} ${auth.status_autorizacao.toUpperCase()}
**Médico:** ${auth.medico_solicitante || 'Não informado'}
**Convênio:** ${auth.convenio || 'Não informado'}
**Data Solicitação:** ${new Date(auth.data_solicitacao).toLocaleDateString('pt-BR')}
${auth.validade_autorizacao ? `**Validade:** ${new Date(auth.validade_autorizacao).toLocaleDateString('pt-BR')}` : ''}

${auth.observacoes ? `**Observações:** ${auth.observacoes}` : ''}

Digite **menu** para voltar ao início.`;
  }

  /**
   * Processa CPF para agendamento
   */
  private async processarAgendamentoCPF(conversa: Conversation, cpf: string): Promise<string> {
    // Validar CPF
    if (!/^\d{11}$/.test(cpf)) {
      return `❌ CPF inválido. Informe 11 dígitos sem pontos ou traços.`;
    }

    conversa.cpf_cliente = cpf;
    conversa.cliente_identificado = true;
    conversa.etapa_atual = 'agendamento_tipo_exame';

    // Buscar tipos de exames disponíveis
    const { data: tipos } = await supabase
      .from('vw_exames_disponiveis')
      .select('tipo_exame')
      .order('tipo_exame');

    if (!tipos || tipos.length === 0) {
      return `❌ Nenhum exame disponível no momento. Tente novamente mais tarde.`;
    }

    // Remover duplicatas
    const tiposUnicos = [...new Set(tipos.map((t: any) => t.tipo_exame))];
    
    let resposta = `📋 **Tipos de exames disponíveis:**\n\n`;
    
    tiposUnicos.forEach((tipo, index) => {
      resposta += `**${index + 1}.** ${tipo}\n`;
    });

    resposta += `\nDigite o **número** do exame desejado:`;
    
    conversa.dados_temporarios = { tipos_exames: tiposUnicos };
    return resposta;
  }

  /**
   * Processa seleção do tipo de exame
   */
  private async processarTipoExame(conversa: Conversation, opcao: string): Promise<string> {
    const numero = parseInt(opcao);
    const tipos = conversa.dados_temporarios.tipos_exames;

    if (isNaN(numero) || numero < 1 || numero > tipos.length) {
      return this.adicionarRodape(`❌ Opção inválida. Digite um número de 1 a ${tipos.length}.`);
    }

    const tipoSelecionado = tipos[numero - 1];
    conversa.dados_temporarios.tipo_exame_selecionado = tipoSelecionado;
    conversa.etapa_atual = 'agendamento_horario';

    // Buscar horários disponíveis
    const { data: horarios } = await supabase
      .from('vw_exames_disponiveis')
      .select('*')
      .eq('tipo_exame', tipoSelecionado)
      .order('data_hora')
      .limit(10);

    if (!horarios || horarios.length === 0) {
      return `❌ Nenhum horário disponível para ${tipoSelecionado}. 

Digite **menu** para voltar e escolher outro exame.`;
    }

    let resposta = `📅 **Horários disponíveis para ${tipoSelecionado}:**\n\n`;
    
    horarios.forEach((h: any, index: number) => {
      resposta += `**${index + 1}.** ${h.data_formatada} às ${h.hora_formatada} - ${h.clinica_nome} (${h.cidade})\n`;
    });

    resposta += `\nDigite o **número** do horário desejado:`;
    
    conversa.dados_temporarios.horarios_disponiveis = horarios;
    return resposta;
  }

  /**
   * Processa escolha do horário
   */
  private async processarEscolhaHorario(conversa: Conversation, opcao: string): Promise<string> {
    const numero = parseInt(opcao);
    const horarios = conversa.dados_temporarios.horarios_disponiveis;

    if (isNaN(numero) || numero < 1 || numero > horarios.length) {
      return this.adicionarRodape(`❌ Opção inválida. Digite um número de 1 a ${horarios.length}.`);
    }

    const horarioSelecionado = horarios[numero - 1];
    conversa.dados_temporarios.horario_selecionado = horarioSelecionado;
    conversa.etapa_atual = 'agendamento_confirmacao';

    return `✅ **Confirmar Agendamento:**

**Exame:** ${conversa.dados_temporarios.tipo_exame_selecionado}
**Data/Hora:** ${horarioSelecionado.data_formatada} às ${horarioSelecionado.hora_formatada}
**Local:** ${horarioSelecionado.clinica_nome} - ${horarioSelecionado.cidade}
**CPF:** ${conversa.cpf_cliente}

Digite **CONFIRMAR** para agendar ou **CANCELAR** para voltar:`;
  }

  /**
   * Processa confirmação do agendamento
   */
  private async processarConfirmacaoAgendamento(conversa: Conversation, opcao: string): Promise<string> {
    const opcaoLower = opcao.toLowerCase();

    if (opcaoLower === 'cancelar') {
      conversa.etapa_atual = 'menu_principal';
      return `❌ Agendamento cancelado.

${this.exibirMenuPrincipal()}`;
    }

    if (opcaoLower !== 'confirmar') {
      return this.adicionarRodape(`❌ Digite **CONFIRMAR** ou **CANCELAR**.`);
    }

    // Realizar agendamento
    try {
      const horario = conversa.dados_temporarios.horario_selecionado;
      const { data: protocolo } = await supabase.rpc('gerar_protocolo_agendamento');

      const { data, error } = await supabase
        .from('agendamento_exames')
        .insert({
          cpf_paciente: conversa.cpf_cliente,
          nome_paciente: 'Paciente', // Aqui você pode buscar o nome real do paciente
          id_disponibilidade: horario.id_disponibilidade,
          id_clinica: horario.id_clinica || 1,
          tipo_exame: conversa.dados_temporarios.tipo_exame_selecionado,
          data_hora: horario.data_hora,
          protocolo_agendamento: protocolo || `AGD${Date.now()}`,
          status: 'agendado'
        })
        .select()
        .single();

      if (error) {
        console.error('[MenuChatService] Erro ao agendar:', error);
        return `❌ Erro ao realizar agendamento. Tente novamente.`;
      }

      // Atualizar vagas ocupadas
      await supabase.rpc('ocupar_vaga_exame', { 
        disponibilidade_id: horario.id_disponibilidade 
      });

      conversa.etapa_atual = 'menu_principal';
      
      return `🎉 **Agendamento realizado com sucesso!**

**Protocolo:** ${data.protocolo_agendamento}
**Exame:** ${data.tipo_exame}
**Data/Hora:** ${horario.data_formatada} às ${horario.hora_formatada}
**Local:** ${horario.clinica_nome}

⚠️ **Importante:** Guarde o número do protocolo para consultas futuras.

Digite **menu** para fazer outro agendamento.`;

    } catch (error) {
      console.error('[MenuChatService] Erro ao confirmar agendamento:', error);
      return `❌ Erro interno. Tente novamente mais tarde.`;
    }
  }

  /**
   * Processa dúvidas usando IA
   */
  private async processarDuvidas(conversa: Conversation, mensagem: string): Promise<string> {
    try {
      // Aqui você manteria a integração com a IA apenas para dúvidas
      // Por enquanto, uma resposta simples
      const perguntasComuns: { [key: string]: string } = {
        'horario': 'Nosso atendimento funciona de segunda a sexta, das 7h às 18h.',
        'telefone': 'Central de atendimento: (11) 3000-0000',
        'endereco': 'Consulte nossos endereços digitando "clinicas"',
        'clinicas': 'Temos unidades em São Paulo, Campinas e Santo André. Digite "endereco [cidade]" para detalhes.',
        'convenio': 'Trabalhamos com os principais convênios. Digite "convenios" para lista completa.',
        'exame': 'Oferecemos exames laboratoriais e de imagem. Use a opção 2 do menu para agendar.',
        'autorizacao': 'Para consultar autorizações, use a opção 1 do menu principal.'
      };

      const mensagemLower = mensagem.toLowerCase();
      
      for (const [chave, resposta] of Object.entries(perguntasComuns)) {
        if (mensagemLower.includes(chave)) {
          return `💡 ${resposta}

Tem mais alguma dúvida? Ou digite **menu** para voltar.`;
        }
      }

      // Se não encontrou resposta automática, resposta genérica
      return `🤖 Entendi sua pergunta sobre "${mensagem}".

Para melhor atendimento, entre em contato:
📞 (11) 3000-0000
📧 atendimento@clinica.com.br
🕒 Seg-Sex: 7h às 18h

Ou digite **menu** para usar nossos serviços digitais.`;

    } catch (error) {
      return this.adicionarRodape(`❌ Erro ao processar sua dúvida. Tente novamente.`);
    }
  }

  /**
   * Busca ou cria uma conversa
   */
  private async buscarOuCriarConversa(idUsuario: string): Promise<Conversation> {
    const { data: conversaExistente } = await supabase
      .from('conversations')
      .select('*')
      .eq('id_usuario', idUsuario)
      .eq('status_conversa', 'aberta')
      .order('data_hora_ultima_mensagem', { ascending: false })
      .limit(1)
      .single();

    if (conversaExistente) {
      return {
        ...conversaExistente,
        data_hora_inicio: new Date(conversaExistente.data_hora_inicio),
        data_hora_ultima_mensagem: new Date(conversaExistente.data_hora_ultima_mensagem),
        mensagens: (conversaExistente.mensagens || []).map((msg: any) => ({
          ...msg,
          data_hora: msg.data_hora ? new Date(msg.data_hora) : new Date()
        }))
      };
    }

    // Criar nova conversa
    const novaConversa = {
      id_usuario: idUsuario,
      data_hora_inicio: new Date().toISOString(),
      data_hora_ultima_mensagem: new Date().toISOString(),
      status_conversa: 'aberta',
      tipo_conversa: 'menu',
      etapa_atual: 'menu_principal',
      dados_temporarios: {},
      cliente_identificado: false,
      mensagens: []
    };

    const { data } = await supabase
      .from('conversations')
      .insert(novaConversa)
      .select()
      .single();

    return {
      ...data,
      data_hora_inicio: new Date(data.data_hora_inicio),
      data_hora_ultima_mensagem: new Date(data.data_hora_ultima_mensagem),
      mensagens: []
    };
  }

  /**
   * Reinicia uma conversa expirada
   */
  private async reiniciarConversa(conversa: Conversation): Promise<Conversation> {
    conversa.status_conversa = 'inativa';
    await this.salvarConversa(conversa);

    // Criar nova conversa
    return await this.buscarOuCriarConversa(conversa.id_usuario);
  }

  /**
   * Salva a conversa no banco
   */
  private async salvarConversa(conversa: Conversation): Promise<void> {
    await supabase
      .from('conversations')
      .update({
        data_hora_ultima_mensagem: new Date().toISOString(),
        status_conversa: conversa.status_conversa,
        tipo_conversa: conversa.tipo_conversa,
        etapa_atual: conversa.etapa_atual,
        dados_temporarios: conversa.dados_temporarios,
        cliente_identificado: conversa.cliente_identificado,
        cpf_cliente: conversa.cpf_cliente,
        mensagens: (conversa.mensagens || []).map(msg => {
          try {
            return {
              remetente: msg.remetente || 'sistema',
              texto: msg.texto || '',
              data_hora: msg.data_hora instanceof Date ? msg.data_hora.toISOString() : 
                         typeof msg.data_hora === 'string' ? msg.data_hora : 
                         new Date().toISOString()
            };
          } catch (error) {
            console.warn('Erro ao formatar mensagem:', msg, error);
            return {
              remetente: 'sistema',
              texto: '',
              data_hora: new Date().toISOString()
            };
          }
        })
      })
      .eq('id_conversa', conversa.id_conversa);
  }

  /**
   * Obtém uma conversa por ID
   */
  public async obterConversa(idConversa: string): Promise<Conversation | null> {
    try {
      const { data: conversaData, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id_conversa', idConversa)
        .single();

      if (error || !conversaData) {
        return null;
      }

      return {
        ...conversaData,
        data_hora_inicio: new Date(conversaData.data_hora_inicio),
        data_hora_ultima_mensagem: new Date(conversaData.data_hora_ultima_mensagem),
        mensagens: (conversaData.mensagens || []).map((msg: any) => ({
          ...msg,
          data_hora: msg.data_hora ? new Date(msg.data_hora) : new Date()
        }))
      };
    } catch (error) {
      console.error('Erro ao buscar conversa:', error);
      return null;
    }
  }
}