// Models para sistema de agendamento

export interface Medico {
  id: string;
  nome: string;
  especialidade: string;
  cidade: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface AgendaMedico {
  id: string;
  medico_id: string;
  data_disponivel: Date;
  horario_inicio: string; // formato HH:MM
  horario_fim: string;    // formato HH:MM
  disponivel: boolean;
  created_at?: Date;
  updated_at?: Date;
}

export interface Agendamento {
  id: string;
  protocolo: string;
  medico_id: string;
  agenda_id: string;
  paciente_nome: string;
  paciente_telefone: string;
  data_agendamento: Date;
  horario: string; // formato HH:MM
  status: 'confirmado' | 'cancelado';
  created_at?: Date;
  updated_at?: Date;
}

export interface AgendamentoTemp {
  especialidade?: string;
  medico_id?: string;
  agenda_id?: string;
  data_selecionada?: string;
  horario_selecionado?: string;
  paciente_nome?: string;
  paciente_telefone?: string;
}

// Tipos para respostas das consultas
export interface MedicoComAgenda extends Medico {
  horarios_disponiveis?: AgendaMedico[];
}

export interface EspecialidadeDisponivel {
  especialidade: string;
  total_medicos: number;
  cidades: string[];
}

export interface HorarioDisponivel {
  agenda_id: string;
  data: string;
  horario_inicio: string;
  horario_fim: string;
  data_formatada: string;
}