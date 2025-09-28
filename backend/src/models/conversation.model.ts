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
  menu_state?: 'menu' | 'ia_mode' | 'agendar_consulta' | 'autorizar_exame'; // Estado do menu (não persistido)
}