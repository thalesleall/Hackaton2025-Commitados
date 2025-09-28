// agendamento-payload.service.ts

import { Conversation, AgendamentoPayload, Message } from '../models/conversation.model';

export class AgendamentoPayloadService {
  
  /**
   * Extrai o payload do agendamento a partir das mensagens salvas
   */
  static extrairPayloadDasMensagens(conversation: Conversation): Partial<AgendamentoPayload> {
    const mensagens = conversation.mensagens || [];
    let payload: Partial<AgendamentoPayload> = {};

    // Percorrer mensagens de trás para frente para pegar os dados mais recentes
    for (let i = mensagens.length - 1; i >= 0; i--) {
      const msg = mensagens[i];
      
      if (msg.agendamento_payload) {
        // Mesclar com dados já encontrados (dados mais recentes têm prioridade)
        payload = { ...msg.agendamento_payload, ...payload };
      }
    }

    console.log('[AgendamentoPayload] Payload extraído:', payload);
    return payload;
  }

  /**
   * Salva dados no payload de uma mensagem
   */
  static salvarDadosNaMensagem(
    mensagem: Message, 
    dados: Partial<AgendamentoPayload>
  ): void {
    if (!mensagem.agendamento_payload) {
      mensagem.agendamento_payload = {};
    }
    
    // Mesclar dados
    mensagem.agendamento_payload = {
      ...mensagem.agendamento_payload,
      ...dados
    };
    
    console.log('[AgendamentoPayload] Dados salvos na mensagem:', dados);
  }

  /**
   * Inicializa ou atualiza o payload na conversa
   */
  static atualizarPayload(
    conversation: Conversation, 
    novosDados: Partial<AgendamentoPayload>
  ): void {
    const teste = novosDados
    if (conversation.agendamento_payload) {
      //conversation.agendamento_payload = {};
      conversation.agendamento_payload = {
      ...conversation.agendamento_payload,
      ...teste
      
    };
    console.log("Chegou aquiiiiiiiiiiiiiiii")
    }
    console.log("AAAAAAAA"  + JSON.stringify(conversation.agendamento_payload))
    
    
    console.log('[AgendamentoPayload] Payload atualizado:', conversation.agendamento_payload);
  }

  /**
   * Valida se o payload está completo para criação do agendamento
   */
  static validarPayloadCompleto(payload: Partial<AgendamentoPayload>): {
    valido: boolean;
    camposFaltando: string[];
  } {
    const camposObrigatorios: (keyof AgendamentoPayload)[] = [
      'especialidade',
      'medico_id',
      'medico_nome',
      'agenda_id', 
      'data_selecionada',
      'horario_inicio',
      'paciente_nome',
      'paciente_telefone'
    ];

    const camposFaltando = camposObrigatorios.filter(campo => !payload[campo]);
    
    return {
      valido: camposFaltando.length === 0,
      camposFaltando
    };
  }

  /**
   * Converte payload para formato esperado pelo AgendamentoService
   */
  static converterParaAgendamento(payload: AgendamentoPayload) {
    return {
      agenda_id: payload.agenda_id,
      paciente_nome: payload.paciente_nome,
      paciente_telefone: payload.paciente_telefone,
      // Dados adicionais para confirmação
      especialidade: payload.especialidade,
      medico_nome: payload.medico_nome,
      data_formatada: payload.data_formatada,
      horario_inicio: payload.horario_inicio
    };
  }

  /**
   * Limpa o payload da conversa
   */
  static limparPayload(conversation: Conversation): void {
    conversation.agendamento_payload = {};
    console.log('[AgendamentoPayload] Payload limpo');
  }

  /**
   * Obtém resumo do agendamento para exibição
   */
  static obterResumo(payload: Partial<AgendamentoPayload>): string {
    if (!payload.especialidade) return 'Agendamento não iniciado';
    
    let resumo = `📋 **RESUMO DO AGENDAMENTO**\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    
    if (payload.especialidade) {
      resumo += `🩺 **Especialidade:** ${payload.especialidade}\n`;
    }
    
    if (payload.medico_nome) {
      resumo += `👨‍⚕️ **Médico:** Dr(a). ${payload.medico_nome}\n`;
    }
    
    if (payload.medico_cidade) {
      resumo += `📍 **Local:** ${payload.medico_cidade}\n`;
    }
    
    if (payload.data_formatada && payload.horario_inicio) {
      resumo += `📅 **Data/Hora:** ${payload.data_formatada} às ${payload.horario_inicio}\n`;
    }
    
    if (payload.paciente_nome) {
      resumo += `👤 **Paciente:** ${payload.paciente_nome}\n`;
    }
    
    if (payload.paciente_telefone) {
      resumo += `📞 **Telefone:** ${payload.paciente_telefone}\n`;
    }
    
    return resumo;
  }
}