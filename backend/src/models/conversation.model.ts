import { AgendamentoStep } from '../services/agendamento-simples.service';

export interface Message {
  remetente: 'usuario' | 'chatbot';
  texto: string;
  data_hora: Date;
}

export interface Conversation {
  id_usuario: string;
  id_conversa: string;
  titulo?: string;
  data_hora_inicio: Date;
  data_hora_ultima_mensagem: Date;
  status_conversa: 'aberta' | 'inativa' | 'fechada';
  mensagens: Message[];
  menu_state?: 'menu' | 'ia_mode' | 'autorizar_exame' | 'agendamento';
  agendamento_step?: AgendamentoStep;
}