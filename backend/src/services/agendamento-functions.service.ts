import { ConsultasService } from '../services/consultas.service';
import { ConsultaAgendamento } from '../models/agendamento.model';

export class AgendamentoFunctions {
  private consultasService: ConsultasService;

  constructor() {
    this.consultasService = new ConsultasService();
  }

  /**
   * Extrai informações de agendamento do texto do usuário usando IA
   */
  public async extrairInformacoesAgendamento(mensagem: string): Promise<any> {
    // Palavras-chave para detectar intenção de agendamento
    const palavrasAgendamento = [
      'agendar', 'marcar', 'consulta', 'médico', 'doutor', 'doutora', 
      'especialista', 'atendimento', 'horário', 'data', 'dia'
    ];

    const palavrasCancelamento = [
      'cancelar', 'desmarcar', 'cancelamento', 'não quero mais'
    ];

    const palavrasConsulta = [
      'minhas consultas', 'meus agendamentos', 'protocolo', 'consultar'
    ];

    const mensagemLower = mensagem.toLowerCase();
    
    // Detectar intenção
    let intencao = '';
    if (palavrasAgendamento.some(palavra => mensagemLower.includes(palavra))) {
      intencao = 'agendar';
    } else if (palavrasCancelamento.some(palavra => mensagemLower.includes(palavra))) {
      intencao = 'cancelar';
    } else if (palavrasConsulta.some(palavra => mensagemLower.includes(palavra))) {
      intencao = 'consultar';
    }

    // Extrair especialidades
    const especialidadesComuns = [
      'cardiologia', 'cardio', 'coração',
      'dermatologia', 'derma', 'pele',
      'ortopedia', 'ortopedista', 'osso', 'articulação',
      'ginecologia', 'gineco', 'ginecologista',
      'pediatria', 'pediatra', 'criança',
      'oftalmologia', 'oftalmo', 'olho', 'vista',
      'neurologia', 'neuro', 'neurologista',
      'psiquiatria', 'psiquiatra', 'mental'
    ];

    let especialidade = '';
    for (const esp of especialidadesComuns) {
      if (mensagemLower.includes(esp)) {
        // Mapear para nomes formais
        if (['cardio', 'coração'].includes(esp)) especialidade = 'Cardiologia';
        else if (['derma', 'pele'].includes(esp)) especialidade = 'Dermatologia';
        else if (['ortopedista', 'osso', 'articulação'].includes(esp)) especialidade = 'Ortopedia';
        else if (['gineco', 'ginecologista'].includes(esp)) especialidade = 'Ginecologia';
        else if (['pediatra', 'criança'].includes(esp)) especialidade = 'Pediatria';
        else if (['oftalmo', 'olho', 'vista'].includes(esp)) especialidade = 'Oftalmologia';
        else if (['neuro', 'neurologista'].includes(esp)) especialidade = 'Neurologia';
        else if (['psiquiatra', 'mental'].includes(esp)) especialidade = 'Psiquiatria';
        else especialidade = esp.charAt(0).toUpperCase() + esp.slice(1);
        break;
      }
    }

    // Extrair CPF (formato XXX.XXX.XXX-XX ou XXXXXXXXXXX)
    const cpfRegex = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/g;
    const cpfMatch = mensagem.match(cpfRegex);
    const cpf = cpfMatch ? cpfMatch[0].replace(/\D/g, '') : '';

    // Extrair protocolo (formato CONYYMMDDXXXX)
    const protocoloRegex = /\bCON\d{10}\b/gi;
    const protocoloMatch = mensagem.match(protocoloRegex);
    const protocolo = protocoloMatch ? protocoloMatch[0].toUpperCase() : '';

    // Extrair nome (buscar por padrões de nome)
    const nomeRegex = /(?:nome|sou|me chamo|chamo|eu sou)\s+([A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+(?:\s+[A-ZÁÂÃÉÊÍÓÔÕÚÇ][a-záâãéêíóôõúç]+)*)/gi;
    const nomeMatch = mensagem.match(nomeRegex);
    const nome = nomeMatch ? nomeMatch[0].replace(/(?:nome|sou|me chamo|chamo|eu sou)\s+/gi, '') : '';

    return {
      intencao,
      especialidade,
      cpf,
      protocolo,
      nome,
      mensagemOriginal: mensagem
    };
  }

  /**
   * Processa comandos de agendamento baseados na análise da mensagem
   */
  public async processarComandoAgendamento(informacoes: any): Promise<string> {
    try {
      switch (informacoes.intencao) {
        case 'agendar':
          return await this.processarAgendamento(informacoes);
        
        case 'cancelar':
          return await this.processarCancelamento(informacoes);
        
        case 'consultar':
          return await this.processarConsulta(informacoes);
        
        default:
          return await this.oferecerOpcoes();
      }
    } catch (error) {
      console.error('[AgendamentoFunctions] Erro ao processar comando:', error);
      return 'Desculpe, ocorreu um erro ao processar sua solicitação. Pode tentar novamente?';
    }
  }

  private async processarAgendamento(info: any): Promise<string> {
    if (!info.nome && !info.cpf) {
      return 'Para agendar sua consulta, preciso do seu nome completo e CPF. Pode me informar, por favor?';
    }

    if (!info.nome) {
      return 'Preciso do seu nome completo para continuar com o agendamento.';
    }

    if (!info.cpf) {
      return 'Preciso do seu CPF para continuar com o agendamento.';
    }

    if (!info.especialidade) {
      const especialidades = await this.consultasService.listarEspecialidades();
      return `Qual especialidade você precisa? Temos disponível: ${especialidades.join(', ')}.`;
    }

    // Buscar vagas disponíveis
    const dataInicio = new Date();
    const dataFim = new Date();
    dataFim.setMonth(dataFim.getMonth() + 1);

    const vagas = await this.consultasService.buscarVagasDisponiveis({
      especialidade: info.especialidade,
      data_inicio: dataInicio,
      data_fim: dataFim
    });

    if (vagas.length === 0) {
      return `Não encontrei vagas disponíveis para ${info.especialidade} no próximo mês. Gostaria de tentar outra especialidade?`;
    }

    // Tentar agendar automaticamente na primeira vaga
    const dadosAgendamento: ConsultaAgendamento = {
      paciente: {
        nome: info.nome,
        cpf: info.cpf
      },
      especialidade: info.especialidade
    };

    const resultado = await this.consultasService.agendarConsulta(dadosAgendamento);

    if (resultado.sucesso) {
      return resultado.mensagem || 'Consulta agendada com sucesso!';
    } else {
      return resultado.mensagem || 'Não foi possível agendar a consulta. Tente novamente.';
    }
  }

  private async processarCancelamento(info: any): Promise<string> {
    if (!info.protocolo) {
      return 'Para cancelar sua consulta, preciso do protocolo. Pode me informar o número do protocolo?';
    }

    const resultado = await this.consultasService.cancelarConsulta(info.protocolo);
    
    if (resultado.sucesso) {
      return resultado.mensagem || 'Consulta cancelada com sucesso!';
    } else {
      return resultado.mensagem || 'Não foi possível cancelar a consulta. Verifique o protocolo.';
    }
  }

  private async processarConsulta(info: any): Promise<string> {
    if (info.protocolo) {
      const consulta = await this.consultasService.buscarConsultaPorProtocolo(info.protocolo);
      if (consulta) {
        return `Encontrei sua consulta:
📋 Protocolo: ${consulta.protocolo}
📅 Data/Hora: ${consulta.data_hora.toLocaleString('pt-BR')}
👨‍⚕️ Especialidade: ${consulta.especialidade}
📍 Status: ${consulta.status}`;
      } else {
        return 'Não encontrei nenhuma consulta com esse protocolo.';
      }
    }

    if (info.cpf) {
      const consultas = await this.consultasService.buscarConsultasPorCPF(info.cpf);
      if (consultas.length === 0) {
        return 'Não encontrei consultas agendadas para este CPF.';
      }

      let resposta = `Encontrei ${consultas.length} consulta(s):\n\n`;
      for (const consulta of consultas.slice(0, 3)) { // Mostrar apenas as 3 mais recentes
        resposta += `📋 ${consulta.protocolo} - ${consulta.data_hora.toLocaleString('pt-BR')} - ${consulta.especialidade} (${consulta.status})\n`;
      }

      if (consultas.length > 3) {
        resposta += `\n... e mais ${consultas.length - 3} consulta(s).`;
      }

      return resposta;
    }

    return 'Para consultar suas consultas, preciso do seu CPF ou protocolo da consulta.';
  }

  private async oferecerOpcoes(): Promise<string> {
    const especialidades = await this.consultasService.listarEspecialidades();
    const cidades = await this.consultasService.listarCidades();

    return `Olá! Sou a recepcionista virtual. Posso ajudá-lo com:

🩺 **Agendar consultas** - Informe seu nome, CPF e especialidade
📋 **Consultar agendamentos** - Informe seu CPF ou protocolo
❌ **Cancelar consultas** - Informe o protocolo

**Especialidades disponíveis:** ${especialidades.slice(0, 5).join(', ')}${especialidades.length > 5 ? '...' : ''}

**Cidades atendidas:** ${cidades.slice(0, 3).join(', ')}${cidades.length > 3 ? '...' : ''}

Como posso ajudá-lo hoje?`;
  }
}