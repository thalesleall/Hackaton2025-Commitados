export interface Message {
  remetente: 'usuario' | 'chatbot';
  texto: string;
  data_hora: Date; // Usaremos objetos Date para facilitar cálculos
  // Metadata para payload do agendamento
  agendamento_payload?: Partial<AgendamentoPayload>;
}

export interface AgendamentoPayload {
  especialidade: string;
  especialidade_opcao: number;
  medico_id: string;
  medico_nome: string;
  medico_cidade: string;
  medico_opcao: number;
  agenda_id: string;
  data_selecionada: string;
  data_formatada: string;
  data_opcao: number;
  horario_inicio: string;
  horario_fim: string;
  paciente_nome: string;
  paciente_telefone: string;
}

export interface Conversation {
  id_usuario: string;
  id_conversa: string;
  titulo?: string; // Título da conversa (opcional)
  data_hora_inicio: Date;
  data_hora_ultima_mensagem: Date;
  status_conversa: 'aberta' | 'inativa' | 'fechada'; // 'fechada' pode ser para encerramento manual
  mensagens: Message[];
  menu_state?: 'menu' | 'ia_mode' | 'agendar_consulta' | 'autorizar_exame' | 
              'agendar_especialidade' | 'agendar_medico' | 'agendar_data' | 
              'agendar_dados' | 'agendar_confirmacao'; // Estado do menu (não persistido)
  
  // Payload do agendamento que vai sendo montado progressivamente
  agendamento_payload?: Partial<AgendamentoPayload>;
}