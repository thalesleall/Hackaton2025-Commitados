// Serviço para sistema de agendamento

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '../config/bd';
import { 
  Medico, 
  AgendaMedico, 
  Agendamento, 
  MedicoComAgenda, 
  EspecialidadeDisponivel,
  HorarioDisponivel 
} from '../models/agendamento.model';

export class AgendamentoService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = supabase;
    console.log('AgendamentoService inicializado.');
  }

  /**
   * Busca todas as especialidades disponíveis
   */
  async getEspecialidades(): Promise<EspecialidadeDisponivel[]> {
    try {
      const { data, error } = await this.supabase
        .from('medicos')
        .select('especialidade, cidade')
        .order('especialidade');

      if (error) throw error;

      // Agrupar por especialidade
      const especialidadesMap = new Map<string, Set<string>>();
      
      data.forEach((medico: any) => {
        if (!especialidadesMap.has(medico.especialidade)) {
          especialidadesMap.set(medico.especialidade, new Set());
        }
        especialidadesMap.get(medico.especialidade)!.add(medico.cidade);
      });

      return Array.from(especialidadesMap.entries()).map(([especialidade, cidades]) => ({
        especialidade,
        total_medicos: data.filter((m: any) => m.especialidade === especialidade).length,
        cidades: Array.from(cidades).sort()
      }));

    } catch (error) {
      console.error('[AgendamentoService] Erro ao buscar especialidades:', error);
      throw error;
    }
  }

  /**
   * Busca médicos por especialidade
   */
  async getMedicosPorEspecialidade(especialidade: string): Promise<Medico[]> {
    try {
      const { data, error } = await this.supabase
        .from('medicos')
        .select('*')
        .eq('especialidade', especialidade)
        .order('cidade', { ascending: true })
        .order('nome', { ascending: true });

      if (error) throw error;
      return data || [];

    } catch (error) {
      console.error('[AgendamentoService] Erro ao buscar médicos:', error);
      throw error;
    }
  }

  /**
   * Busca horários disponíveis de um médico nos próximos 30 dias
   */
  async getHorariosDisponiveis(medicoId: string): Promise<HorarioDisponivel[]> {
    try {
      const hoje = new Date();
      const umMesDepois = new Date();
      umMesDepois.setDate(hoje.getDate() + 30);

      const { data, error } = await this.supabase
        .from('agenda_medicos')
        .select('*')
        .eq('medico_id', medicoId)
        .eq('disponivel', true)
        .gte('data_disponivel', hoje.toISOString().split('T')[0])
        .lte('data_disponivel', umMesDepois.toISOString().split('T')[0])
        .order('data_disponivel', { ascending: true })
        .order('horario_inicio', { ascending: true });

      if (error) throw error;

      return (data || []).map((agenda: any) => ({
        agenda_id: agenda.id,
        data: agenda.data_disponivel,
        horario_inicio: agenda.horario_inicio,
        horario_fim: agenda.horario_fim,
        data_formatada: this.formatarData(new Date(agenda.data_disponivel))
      }));

    } catch (error) {
      console.error('[AgendamentoService] Erro ao buscar horários:', error);
      throw error;
    }
  }

  /**
   * Confirma um agendamento
   */
  async confirmarAgendamento(
    agendaId: string,
    pacienteNome: string,
    pacienteTelefone: string
  ): Promise<string> {
    try {
      // 1. Buscar dados da agenda
      const { data: agenda, error: agendaError } = await this.supabase
        .from('agenda_medicos')
        .select('*, medicos(nome)')
        .eq('id', agendaId)
        .eq('disponivel', true)
        .single();

      if (agendaError || !agenda) {
        throw new Error('Horário não encontrado ou já foi ocupado');
      }

      // 2. Gerar protocolo único
      const protocolo = await this.gerarProtocolo();

      // 3. Criar o agendamento
      const { data: novoAgendamento, error: agendamentoError } = await this.supabase
        .from('agendamentos')
        .insert({
          protocolo,
          medico_id: agenda.medico_id,
          agenda_id: agendaId,
          paciente_nome: pacienteNome,
          paciente_telefone: pacienteTelefone,
          data_agendamento: agenda.data_disponivel,
          horario: agenda.horario_inicio,
          status: 'confirmado'
        })
        .select()
        .single();

      if (agendamentoError) throw agendamentoError;

      // 4. Marcar horário como indisponível
      const { error: updateError } = await this.supabase
        .from('agenda_medicos')
        .update({ disponivel: false })
        .eq('id', agendaId);

      if (updateError) throw updateError;

      return protocolo;

    } catch (error) {
      console.error('[AgendamentoService] Erro ao confirmar agendamento:', error);
      throw error;
    }
  }

  /**
   * Busca agendamento por protocolo
   */
  async buscarPorProtocolo(protocolo: string): Promise<any> {
    try {
      const { data, error } = await this.supabase
        .from('agendamentos')
        .select(`
          *,
          medicos (
            nome,
            especialidade,
            cidade
          )
        `)
        .eq('protocolo', protocolo)
        .single();

      if (error) throw error;
      return data;

    } catch (error) {
      console.error('[AgendamentoService] Erro ao buscar protocolo:', error);
      throw error;
    }
  }

  /**
   * Gera protocolo único para agendamento
   */
  private async gerarProtocolo(): Promise<string> {
    const agora = new Date();
    const ano = agora.getFullYear();
    const mes = String(agora.getMonth() + 1).padStart(2, '0');
    
    // Buscar o último protocolo do mês
    const prefixo = `AGD-${ano}${mes}`;
    
    const { data, error } = await this.supabase
      .from('agendamentos')
      .select('protocolo')
      .like('protocolo', `${prefixo}%`)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Erro ao buscar último protocolo:', error);
    }

    let proximoNumero = 1;
    if (data && data.length > 0) {
      const ultimoProtocolo = data[0].protocolo;
      const ultimoNumero = parseInt(ultimoProtocolo.split('-').pop() || '0');
      proximoNumero = ultimoNumero + 1;
    }

    return `${prefixo}-${String(proximoNumero).padStart(3, '0')}`;
  }

  /**
   * Formata data para exibição
   */
  private formatarData(data: Date): string {
    const diasSemana = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const diaSemana = diasSemana[data.getDay()];
    const dia = data.getDate();
    const mes = meses[data.getMonth()];

    return `${diaSemana}, ${dia} de ${mes}`;
  }

  /**
   * Formata horário para exibição
   */
  formatarHorario(horario: string): string {
    return horario.substring(0, 5); // Remove segundos se existirem
  }
}