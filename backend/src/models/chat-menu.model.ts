export interface Message {
  remetente: 'usuario' | 'sistema';
  texto: string;
  data_hora: Date;
  tipo_mensagem?: 'menu' | 'resposta' | 'opcao';
}

export interface Conversation {
  id_conversa: string;
  id_usuario: string;
  data_hora_inicio: Date;
  data_hora_ultima_mensagem: Date;
  status_conversa: 'aberta' | 'inativa' | 'fechada';
  tipo_conversa: 'menu' | 'autorizacao' | 'agendamento' | 'duvidas';
  opcao_selecionada?: number;
  etapa_atual: string;
  dados_temporarios: any;
  cliente_identificado: boolean;
  cpf_cliente?: string;
  mensagens: Message[];
}

export interface AutorizacaoExame {
  id_autorizacao?: number;
  cpf_paciente: string;
  nome_paciente: string;
  codigo_procedimento: string;
  nome_procedimento: string;
  medico_solicitante?: string;
  crm_medico?: string;
  data_solicitacao?: Date;
  status_autorizacao: 'pendente' | 'autorizado' | 'negado';
  numero_autorizacao?: string;
  observacoes?: string;
  convenio?: string;
  data_autorizacao?: Date;
  validade_autorizacao?: Date;
}

export interface AgendamentoExame {
  id_agendamento?: number;
  cpf_paciente: string;
  nome_paciente: string;
  id_disponibilidade: number;
  id_clinica: number;
  tipo_exame: string;
  data_hora: Date;
  protocolo_agendamento?: string;
  status: 'agendado' | 'confirmado' | 'realizado' | 'cancelado';
  telefone?: string;
  email?: string;
  observacoes?: string;
}

export interface DisponibilidadeExame {
  id_disponibilidade: number;
  id_clinica: number;
  tipo_exame: string;
  data_hora: Date;
  vagas_disponiveis: number;
  vagas_ocupadas: number;
  status: 'disponivel' | 'lotado' | 'cancelado';
  clinica_nome?: string;
  cidade?: string;
}

export interface MenuOption {
  numero: number;
  texto: string;
  acao: string;
}

export interface FluxoConversa {
  etapa: string;
  mensagem: string;
  opcoes?: MenuOption[];
  proximaEtapa?: string;
  requerDados?: string[];
}