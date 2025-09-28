// src/services/agendamento-simples.service.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export interface AgendamentoStep {
  step: 'ESPECIALIDADE' | 'MEDICO' | 'DATA_HORARIO' | 'DADOS_PACIENTE' | 'CONFIRMACAO';
  especialidade?: string;
  medicoId?: string;
  medicoNome?: string;
  agendaId?: string;
  dataHorario?: string;
  pacienteNome?: string;
  pacienteTelefone?: string;
  pacienteDataNascimento?: string;
  motivoConsulta?: string;
}

export class AgendamentoSimplesService {
  
  /**
   * Função principal que gerencia o fluxo de agendamento
   */
  async processarAgendamento(step: AgendamentoStep, userInput: string): Promise<{ message: string; nextStep: AgendamentoStep }> {
    
    switch (step.step) {
      
      case 'ESPECIALIDADE':
        return await this.handleEspecialidadeStep(step, userInput);
        
      case 'MEDICO':
        return await this.handleMedicoStep(step, userInput);
        
      case 'DATA_HORARIO':
        return await this.handleDataHorarioStep(step, userInput);
        
      case 'DADOS_PACIENTE':
        return await this.handleDadosPacienteStep(step, userInput);
        
      case 'CONFIRMACAO':
        return await this.handleConfirmacaoStep(step, userInput);
        
      default:
        return await this.iniciarFluxo();
    }
  }

  /**
   * Inicia o fluxo mostrando especialidades disponíveis
   */
  private async iniciarFluxo(): Promise<{ message: string; nextStep: AgendamentoStep }> {
    try {
      const { data: especialidades, error } = await supabase
        .from('medicos')
        .select('especialidade')
        .order('especialidade');

      if (error) throw error;

      // Remover duplicatas
      const especialidadesUnicas = [...new Set(especialidades?.map(e => e.especialidade) || [])];

      if (especialidadesUnicas.length === 0) {
        return {
          message: '❌ Não há especialidades disponíveis no momento.',
          nextStep: { step: 'ESPECIALIDADE' }
        };
      }

      let message = '📋 **AGENDAMENTO DE CONSULTA**\n\n✨ **Especialidades Disponíveis:**\n\n';
      especialidadesUnicas.forEach((esp, i) => {
        message += `${i + 1}️⃣ ${esp}\n`;
      });
      message += '\n🔢 Digite o número da especialidade desejada:';

      return {
        message,
        nextStep: { step: 'ESPECIALIDADE' }
      };

    } catch (error) {
      console.error('Erro ao buscar especialidades:', error);
      return {
        message: '❌ Erro ao carregar especialidades. Tente novamente.',
        nextStep: { step: 'ESPECIALIDADE' }
      };
    }
  }

  /**
   * Processa seleção de especialidade
   */
  private async handleEspecialidadeStep(step: AgendamentoStep, userInput: string): Promise<{ message: string; nextStep: AgendamentoStep }> {
    // Se não há input (primeira vez), mostrar as especialidades
    if (!userInput || userInput.trim() === '') {
      return await this.iniciarFluxo();
    }

    try {
      const { data: especialidades, error } = await supabase
        .from('medicos')
        .select('especialidade')
        .order('especialidade');

      if (error) throw error;

      const especialidadesUnicas = [...new Set(especialidades?.map(e => e.especialidade) || [])];
      const escolha = parseInt(userInput.trim()) - 1;

      if (isNaN(escolha) || escolha < 0 || escolha >= especialidadesUnicas.length) {
        return {
          message: `❌ Opção inválida. Digite um número entre 1 e ${especialidadesUnicas.length}.`,
          nextStep: step
        };
      }

      const especialidadeSelecionada = especialidadesUnicas[escolha];

      // Buscar médicos da especialidade
      const { data: medicos, error: medicosError } = await supabase
        .from('medicos')
        .select('*')
        .eq('especialidade', especialidadeSelecionada)
        .order('nome');

      if (medicosError) throw medicosError;

      if (medicos.length === 0) {
        return {
          message: `❌ Não há médicos disponíveis para ${especialidadeSelecionada}.`,
          nextStep: { step: 'ESPECIALIDADE' }
        };
      }

      let message = `🩺 **${especialidadeSelecionada.toUpperCase()}**\n\n👨‍⚕️ **Médicos Disponíveis:**\n\n`;
      medicos.forEach((medico, i) => {
        message += `${i + 1}️⃣ Dr(a). ${medico.nome} - ${medico.cidade}\n`;
      });
      message += '\n🔢 Digite o número do médico desejado:';

      return {
        message,
        nextStep: { step: 'MEDICO', especialidade: especialidadeSelecionada }
      };

    } catch (error) {
      console.error('Erro ao processar especialidade:', error);
      return {
        message: '❌ Erro ao processar especialidade. Tente novamente.',
        nextStep: step
      };
    }
  }

  /**
   * Processa seleção de médico
   */
  private async handleMedicoStep(step: AgendamentoStep, userInput: string): Promise<{ message: string; nextStep: AgendamentoStep }> {
    try {
      const { data: medicos, error } = await supabase
        .from('medicos')
        .select('*')
        .eq('especialidade', step.especialidade)
        .order('nome');

      if (error) throw error;

      const escolha = parseInt(userInput.trim()) - 1;

      if (isNaN(escolha) || escolha < 0 || escolha >= medicos.length) {
        return {
          message: `❌ Opção inválida. Digite um número entre 1 e ${medicos.length}.`,
          nextStep: step
        };
      }

      const medicoSelecionado = medicos[escolha];

      // Buscar horários disponíveis
      const { data: agenda, error: agendaError } = await supabase
        .from('agenda_medicos')
        .select('*')
        .eq('medico_id', medicoSelecionado.id)
        .eq('disponivel', true)
        .gte('data_disponivel', new Date().toISOString().split('T')[0])
        .order('data_disponivel')
        .order('horario_inicio')
        .limit(10);

      if (agendaError) throw agendaError;

      if (agenda.length === 0) {
        return {
          message: `❌ Dr(a). ${medicoSelecionado.nome} não possui horários disponíveis.`,
          nextStep: { step: 'MEDICO', especialidade: step.especialidade }
        };
      }

      let message = `📅 **Dr(a). ${medicoSelecionado.nome.toUpperCase()}**\n\n⏰ **Horários Disponíveis:**\n\n`;
      agenda.forEach((slot, i) => {
        const data = new Date(slot.data_disponivel).toLocaleDateString('pt-BR');
        const horario = slot.horario_inicio.substring(0, 5);
        message += `${i + 1}️⃣ ${data} às ${horario}\n`;
      });
      message += '\n🔢 Digite o número do horário desejado:';

      return {
        message,
        nextStep: { 
          step: 'DATA_HORARIO', 
          especialidade: step.especialidade,
          medicoId: medicoSelecionado.id,
          medicoNome: medicoSelecionado.nome
        }
      };

    } catch (error) {
      console.error('Erro ao processar médico:', error);
      return {
        message: '❌ Erro ao processar médico. Tente novamente.',
        nextStep: step
      };
    }
  }

  /**
   * Processa seleção de data/horário
   */
  private async handleDataHorarioStep(step: AgendamentoStep, userInput: string): Promise<{ message: string; nextStep: AgendamentoStep }> {
    try {
      const { data: agenda, error } = await supabase
        .from('agenda_medicos')
        .select('*')
        .eq('medico_id', step.medicoId)
        .eq('disponivel', true)
        .gte('data_disponivel', new Date().toISOString().split('T')[0])
        .order('data_disponivel')
        .order('horario_inicio')
        .limit(10);

      if (error) throw error;

      const escolha = parseInt(userInput.trim()) - 1;

      if (isNaN(escolha) || escolha < 0 || escolha >= agenda.length) {
        return {
          message: `❌ Opção inválida. Digite um número entre 1 e ${agenda.length}.`,
          nextStep: step
        };
      }

      const slotSelecionado = agenda[escolha];
      const data = new Date(slotSelecionado.data_disponivel).toLocaleDateString('pt-BR');
      const horario = slotSelecionado.horario_inicio.substring(0, 5);

      const message = `📝 **DADOS DO PACIENTE**\n\nPor favor, informe os dados separados por vírgula:\n**Nome, Telefone, Data de Nascimento (DD/MM/AAAA), Motivo da consulta**\n\n**Exemplo:** João Silva, (11) 99999-9999, 01/01/1990, Consulta de rotina`;

      return {
        message,
        nextStep: {
          ...step,
          step: 'DADOS_PACIENTE',
          agendaId: slotSelecionado.id,
          dataHorario: `${data} às ${horario}`
        }
      };

    } catch (error) {
      console.error('Erro ao processar horário:', error);
      return {
        message: '❌ Erro ao processar horário. Tente novamente.',
        nextStep: step
      };
    }
  }

  /**
   * Processa dados do paciente
   */
  private async handleDadosPacienteStep(step: AgendamentoStep, userInput: string): Promise<{ message: string; nextStep: AgendamentoStep }> {
    const dados = userInput.split(',').map(item => item.trim());

    if (dados.length !== 4) {
      return {
        message: '❌ Formato inválido. Envie: Nome, Telefone, Data de Nascimento, Motivo',
        nextStep: step
      };
    }

    const [nome, telefone, dataNascimento, motivo] = dados;

    // Validação básica da data
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(dataNascimento)) {
      return {
        message: '❌ Data de nascimento inválida. Use o formato DD/MM/AAAA.',
        nextStep: step
      };
    }

    const message = `✅ **CONFIRMAÇÃO DO AGENDAMENTO**\n\n` +
      `👨‍⚕️ **Médico:** Dr(a). ${step.medicoNome}\n` +
      `🏥 **Especialidade:** ${step.especialidade}\n` +
      `📅 **Data/Horário:** ${step.dataHorario}\n` +
      `👤 **Paciente:** ${nome}\n` +
      `📞 **Telefone:** ${telefone}\n` +
      `🎂 **Nascimento:** ${dataNascimento}\n` +
      `📝 **Motivo:** ${motivo}\n\n` +
      `Digite **CONFIRMAR** para agendar ou **CANCELAR** para cancelar:`;

    return {
      message,
      nextStep: {
        ...step,
        step: 'CONFIRMACAO',
        pacienteNome: nome,
        pacienteTelefone: telefone,
        pacienteDataNascimento: dataNascimento,
        motivoConsulta: motivo
      }
    };
  }

  /**
   * Processa confirmação final
   */
  private async handleConfirmacaoStep(step: AgendamentoStep, userInput: string): Promise<{ message: string; nextStep: AgendamentoStep }> {
    const input = userInput.trim().toLowerCase();

    if (input === 'cancelar') {
      return {
        message: '❌ Agendamento cancelado.',
        nextStep: { step: 'ESPECIALIDADE' }
      };
    }

    if (input !== 'confirmar') {
      return {
        message: '❌ Digite **CONFIRMAR** ou **CANCELAR**.',
        nextStep: step
      };
    }

    try {
      // Gerar protocolo
      const protocolo = `AGD${Date.now().toString().slice(-8)}`;

      // Converter data de nascimento
      const [dia, mes, ano] = step.pacienteDataNascimento!.split('/');
      const dataNascimentoISO = `${ano}-${mes}-${dia}`;

      // Buscar dados da agenda
      const { data: agendaData, error: agendaError } = await supabase
        .from('agenda_medicos')
        .select('*')
        .eq('id', step.agendaId)
        .single();

      if (agendaError) throw agendaError;

      // Criar agendamento
      const { data: agendamento, error: agendamentoError } = await supabase
        .from('agendamentos')
        .insert({
          protocolo,
          medico_id: step.medicoId,
          agenda_id: step.agendaId,
          paciente_nome: step.pacienteNome,
          paciente_telefone: step.pacienteTelefone,
          paciente_data_nascimento: dataNascimentoISO,
          motivo_consulta: step.motivoConsulta,
          data_agendamento: agendaData.data_disponivel,
          horario: agendaData.horario_inicio
        })
        .select()
        .single();

      if (agendamentoError) throw agendamentoError;

      // Marcar agenda como indisponível
      await supabase
        .from('agenda_medicos')
        .update({ disponivel: false })
        .eq('id', step.agendaId);

      const message = `🎉 **AGENDAMENTO CONFIRMADO!**\n\n` +
        `🎫 **Protocolo:** ${protocolo}\n` +
        `👨‍⚕️ **Médico:** Dr(a). ${step.medicoNome}\n` +
        `📅 **Data/Horário:** ${step.dataHorario}\n` +
        `👤 **Paciente:** ${step.pacienteNome}\n\n` +
        `✅ Consulta agendada com sucesso!\n` +
        `💡 Anote seu protocolo para referência.`;

      return {
        message,
        nextStep: { step: 'ESPECIALIDADE' }
      };

    } catch (error) {
      console.error('Erro ao confirmar agendamento:', error);
      return {
        message: '❌ Erro ao confirmar agendamento. Tente novamente.',
        nextStep: step
      };
    }
  }
}