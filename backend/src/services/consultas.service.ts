import { supabase } from '../config/bd';
import { 
  Paciente, 
  Medico, 
  VagaDisponivel, 
  ConsultaAgendada, 
  FiltroAgendamento, 
  ResultadoAgendamento, 
  ConsultaAgendamento,
  Clinica 
} from '../models/agendamento.model';

export class ConsultasService {
  constructor() {
    console.log('ConsultasService inicializado.');
  }

  /**
   * Busca vagas disponíveis no período de 1 mês a partir de hoje
   */
  public async buscarVagasDisponiveis(filtros: FiltroAgendamento): Promise<VagaDisponivel[]> {
    try {
      let query = supabase
        .from('vaga')
        .select(`
          id_vaga,
          id_agenda,
          id_medico,
          data_hora,
          medico!inner(nome, especialidade),
          agenda!left(rede_credenciada!left(nome, localizacao))
        `)
        .gte('data_hora', filtros.data_inicio.toISOString())
        .lte('data_hora', filtros.data_fim.toISOString())
        .order('data_hora', { ascending: true })
        .limit(50);

      if (filtros.especialidade) {
        query = query.ilike('medico.especialidade', filtros.especialidade);
      }

      if (filtros.cidade) {
        query = query.ilike('agenda.rede_credenciada.localizacao', `%${filtros.cidade}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error('[ConsultasService] Erro Supabase ao buscar vagas:', error);
        throw new Error('Erro ao buscar vagas disponíveis');
      }

      // Filtrar vagas não ocupadas
      const vagasOcupadas = await supabase
        .from('consulta')
        .select('id_vaga')
        .not('id_vaga', 'is', null)
        .neq('status', 'cancelada');

      const idsVagasOcupadas = vagasOcupadas.data?.map(c => c.id_vaga) || [];

      return (data || [])
        .filter((vaga: any) => !idsVagasOcupadas.includes(vaga.id_vaga))
        .map((vaga: any) => ({
          id_vaga: vaga.id_vaga,
          id_agenda: vaga.id_agenda,
          id_medico: vaga.id_medico,
          data_hora: new Date(vaga.data_hora),
          medico_nome: Array.isArray(vaga.medico) ? vaga.medico[0]?.nome || '' : vaga.medico?.nome || '',
          especialidade: Array.isArray(vaga.medico) ? vaga.medico[0]?.especialidade || '' : vaga.medico?.especialidade || '',
          clinica_nome: Array.isArray(vaga.agenda) && Array.isArray(vaga.agenda[0]?.rede_credenciada) ? 
                       vaga.agenda[0]?.rede_credenciada[0]?.nome || '' : '',
          localizacao: Array.isArray(vaga.agenda) && Array.isArray(vaga.agenda[0]?.rede_credenciada) ? 
                      vaga.agenda[0]?.rede_credenciada[0]?.localizacao || '' : ''
        }));
    } catch (error) {
      console.error('[ConsultasService] Erro ao buscar vagas disponíveis:', error);
      throw new Error('Erro ao buscar vagas disponíveis');
    }
  }

  /**
   * Busca ou cria um paciente pelo CPF
   */
  public async buscarOuCriarPaciente(dadosPaciente: Paciente): Promise<Paciente> {
    try {
      // Primeiro tenta buscar o paciente existente
      const { data: pacienteExistente } = await supabase
        .from('paciente')
        .select('*')
        .eq('cpf', dadosPaciente.cpf)
        .single();

      if (pacienteExistente) {
        return {
          ...pacienteExistente,
          datanascimento: pacienteExistente.datanascimento ? new Date(pacienteExistente.datanascimento) : undefined
        };
      }

      // Se não existe, cria um novo
      const { data: novoPaciente, error } = await supabase
        .from('paciente')
        .insert({
          nome: dadosPaciente.nome,
          cpf: dadosPaciente.cpf,
          datanascimento: dadosPaciente.datanascimento?.toISOString().split('T')[0] || null,
          telefone: dadosPaciente.telefone || null,
          email: dadosPaciente.email || null,
          convenio: dadosPaciente.convenio || null
        })
        .select()
        .single();

      if (error) {
        console.error('[ConsultasService] Erro ao criar paciente:', error);
        throw new Error('Erro ao criar paciente');
      }

      return {
        ...novoPaciente,
        datanascimento: novoPaciente.datanascimento ? new Date(novoPaciente.datanascimento) : undefined
      };
    } catch (error) {
      console.error('[ConsultasService] Erro ao buscar/criar paciente:', error);
      throw new Error('Erro ao processar dados do paciente');
    }
  }

  /**
   * Agenda uma nova consulta
   */
  public async agendarConsulta(dadosAgendamento: ConsultaAgendamento): Promise<ResultadoAgendamento> {
    try {
      // 1. Buscar ou criar paciente
      const paciente = await this.buscarOuCriarPaciente(dadosAgendamento.paciente);

      // 2. Buscar vagas disponíveis
      const dataInicio = new Date();
      const dataFim = new Date();
      dataFim.setMonth(dataFim.getMonth() + 1); // 1 mês à frente

      const filtros: FiltroAgendamento = {
        especialidade: dadosAgendamento.especialidade,
        cidade: dadosAgendamento.cidade,
        data_inicio: dataInicio,
        data_fim: dataFim
      };

      const vagasDisponiveis = await this.buscarVagasDisponiveis(filtros);

      if (vagasDisponiveis.length === 0) {
        return {
          sucesso: false,
          mensagem: `Não há vagas disponíveis para ${dadosAgendamento.especialidade} no período de 1 mês.`
        };
      }

      // 3. Selecionar a primeira vaga disponível (ou a mais próxima da data preferida)
      let vagaSelecionada = vagasDisponiveis[0];
      
      if (dadosAgendamento.data_preferencia) {
        vagaSelecionada = vagasDisponiveis.reduce((anterior, atual) => {
          const diffAnterior = Math.abs(anterior.data_hora.getTime() - dadosAgendamento.data_preferencia!.getTime());
          const diffAtual = Math.abs(atual.data_hora.getTime() - dadosAgendamento.data_preferencia!.getTime());
          return diffAtual < diffAnterior ? atual : anterior;
        });
      }

      // 4. Gerar protocolo único
      const protocolo = this.gerarProtocolo();

      // 5. Criar a consulta
      const { data: consultaData, error: consultaError } = await supabase
        .from('consulta')
        .insert({
          id_paciente: paciente.id_paciente,
          id_medico: vagaSelecionada.id_medico,
          id_vaga: vagaSelecionada.id_vaga,
          data_hora: vagaSelecionada.data_hora.toISOString(),
          protocolo: protocolo,
          tipo: 'consulta',
          status: 'agendada',
          especialidade: dadosAgendamento.especialidade,
          observacoes: dadosAgendamento.observacoes || null
        })
        .select()
        .single();

      if (consultaError) {
        console.error('[ConsultasService] Erro ao criar consulta:', consultaError);
        throw new Error('Erro ao agendar consulta');
      }

      const consultaAgendada: ConsultaAgendada = {
        ...consultaData,
        data_hora: new Date(consultaData.data_hora)
      };

      return {
        sucesso: true,
        consulta: consultaAgendada,
        protocolo: protocolo,
        mensagem: `Consulta agendada com sucesso! Protocolo: ${protocolo}. Data: ${vagaSelecionada.data_hora.toLocaleString('pt-BR')} com Dr(a). ${vagaSelecionada.medico_nome}.`
      };

    } catch (error) {
      console.error('[ConsultasService] Erro ao agendar consulta:', error);
      return {
        sucesso: false,
        mensagem: 'Erro interno ao agendar consulta. Tente novamente.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Busca consultas por CPF do paciente
   */
  public async buscarConsultasPorCPF(cpf: string): Promise<ConsultaAgendada[]> {
    try {
      const { data, error } = await supabase
        .from('consulta')
        .select(`
          *,
          medico!inner(nome),
          paciente!inner(nome, cpf),
          rede_credenciada(nome)
        `)
        .eq('paciente.cpf', cpf)
        .order('data_hora', { ascending: false });

      if (error) {
        console.error('[ConsultasService] Erro ao buscar consultas por CPF:', error);
        throw new Error('Erro ao buscar consultas');
      }

      return (data || []).map(consulta => ({
        ...consulta,
        data_hora: new Date(consulta.data_hora)
      }));
    } catch (error) {
      console.error('[ConsultasService] Erro ao buscar consultas por CPF:', error);
      throw new Error('Erro ao buscar consultas');
    }
  }

  /**
   * Busca consulta por protocolo
   */
  public async buscarConsultaPorProtocolo(protocolo: string): Promise<ConsultaAgendada | null> {
    try {
      const { data, error } = await supabase
        .from('consulta')
        .select(`
          *,
          medico!inner(nome),
          paciente!inner(nome),
          rede_credenciada(nome)
        `)
        .eq('protocolo', protocolo)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Não encontrado
        }
        console.error('[ConsultasService] Erro ao buscar consulta por protocolo:', error);
        throw new Error('Erro ao buscar consulta');
      }

      return {
        ...data,
        data_hora: new Date(data.data_hora)
      };
    } catch (error) {
      console.error('[ConsultasService] Erro ao buscar consulta por protocolo:', error);
      throw new Error('Erro ao buscar consulta');
    }
  }

  /**
   * Cancela uma consulta
   */
  public async cancelarConsulta(protocolo: string, motivo?: string): Promise<ResultadoAgendamento> {
    try {
      const consulta = await this.buscarConsultaPorProtocolo(protocolo);
      
      if (!consulta) {
        return {
          sucesso: false,
          mensagem: 'Consulta não encontrada com esse protocolo.'
        };
      }

      if (consulta.status === 'cancelada') {
        return {
          sucesso: false,
          mensagem: 'Esta consulta já foi cancelada.'
        };
      }

      const { error: updateError } = await supabase
        .from('consulta')
        .update({
          status: 'cancelada',
          observacoes: `${consulta.observacoes || ''}. Cancelada: ${motivo || 'Sem motivo informado'}`
        })
        .eq('protocolo', protocolo);

      if (updateError) {
        console.error('[ConsultasService] Erro ao cancelar consulta:', updateError);
        throw new Error('Erro ao cancelar consulta');
      }

      return {
        sucesso: true,
        mensagem: `Consulta ${protocolo} cancelada com sucesso.`
      };
    } catch (error) {
      console.error('[ConsultasService] Erro ao cancelar consulta:', error);
      return {
        sucesso: false,
        mensagem: 'Erro ao cancelar consulta. Tente novamente.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      };
    }
  }

  /**
   * Lista especialidades disponíveis
   */
  public async listarEspecialidades(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('medico')
        .select('especialidade')
        .not('especialidade', 'is', null)
        .order('especialidade', { ascending: true });

      if (error) {
        console.error('[ConsultasService] Erro ao listar especialidades:', error);
        return [];
      }

      // Remover duplicatas
      const especialidades = [...new Set(data.map((item: any) => item.especialidade))];
      return especialidades;
    } catch (error) {
      console.error('[ConsultasService] Erro ao listar especialidades:', error);
      return [];
    }
  }

  /**
   * Lista cidades disponíveis
   */
  public async listarCidades(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('rede_credenciada')
        .select('localizacao')
        .not('localizacao', 'is', null)
        .order('localizacao', { ascending: true });

      if (error) {
        console.error('[ConsultasService] Erro ao listar cidades:', error);
        return [];
      }

      // Remover duplicatas
      const cidades = [...new Set(data.map((item: any) => item.localizacao))];
      return cidades;
    } catch (error) {
      console.error('[ConsultasService] Erro ao listar cidades:', error);
      return [];
    }
  }

  /**
   * Gera um protocolo único para a consulta
   */
  private gerarProtocolo(): string {
    const agora = new Date();
    const ano = agora.getFullYear().toString().slice(-2);
    const mes = (agora.getMonth() + 1).toString().padStart(2, '0');
    const dia = agora.getDate().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    
    return `CON${ano}${mes}${dia}${random}`;
  }
}
