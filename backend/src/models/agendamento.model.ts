export interface Paciente {
  id_paciente?: number;
  nome: string;
  cpf: string;
  datanascimento?: Date;
  telefone?: string;
  email?: string;
  convenio?: string;
  idnivelnecessidade?: string;
}

export interface Medico {
  id_medico: number;
  nome: string;
  especialidade: string;
  crm?: string;
  telefone?: string;
  email?: string;
}

export interface Clinica {
  id_clinica: number;
  nome: string;
  localizacao: string;
  cidade?: string;
  endereco?: string;
}

export interface VagaDisponivel {
  id_vaga: number;
  id_agenda: number;
  id_medico: number;
  data_hora: Date;
  medico_nome: string;
  especialidade: string;
  clinica_nome?: string;
  localizacao?: string;
}

export interface ConsultaAgendada {
  id_consulta: number;
  id_paciente: number;
  id_medico: number;
  id_vaga?: number;
  id_clinica?: number;
  data_hora: Date;
  protocolo: string;
  tipo?: string;
  status: 'agendada' | 'confirmada' | 'em_andamento' | 'finalizada' | 'cancelada';
  local?: string;
  especialidade: string;
  historico?: string;
  observacoes?: string;
}

export interface FiltroAgendamento {
  especialidade?: string;
  cidade?: string;
  medico?: string;
  data_inicio: Date;
  data_fim: Date;
}

export interface ResultadoAgendamento {
  sucesso: boolean;
  consulta?: ConsultaAgendada;
  protocolo?: string;
  mensagem: string;
  erro?: string;
}

export interface ConsultaAgendamento {
  paciente: Paciente;
  especialidade: string;
  data_preferencia?: Date;
  cidade?: string;
  medico_preferencia?: string;
  observacoes?: string;
}