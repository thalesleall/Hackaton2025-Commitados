export interface Message {
  remetente: 'usuario' | 'chatbot';
  texto: string;
  data_hora: Date; // Usaremos objetos Date para facilitar cálculos
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
  
  // Dados temporários para agendamento (não persistidos)
  agendamento_temp?: {
    especialidade?: string;
    medico_id?: string;
    medico_nome?: string;
    agenda_id?: string;
    data_selecionada?: string;
    horario_selecionado?: string;
    paciente_nome?: string;
    paciente_telefone?: string;
  };
}