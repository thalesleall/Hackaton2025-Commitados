import { Request, Response } from 'express';
import { ConsultasService } from '../services/consultas.service';
import { ConsultaAgendamento, FiltroAgendamento } from '../models/agendamento.model';

export class ConsultasController {
  private consultasService: ConsultasService;

  constructor() {
    this.consultasService = new ConsultasService();
  }

  /**
   * Busca vagas disponíveis
   * GET /api/consultas/vagas-disponiveis
   */
  public async buscarVagasDisponiveis(req: Request, res: Response): Promise<void> {
    try {
      const { especialidade, cidade, data_inicio, data_fim } = req.query;

      // Definir período padrão de 1 mês se não fornecido
      const dataInicio = data_inicio ? new Date(data_inicio as string) : new Date();
      const dataFim = data_fim ? new Date(data_fim as string) : (() => {
        const umMesAfrente = new Date();
        umMesAfrente.setMonth(umMesAfrente.getMonth() + 1);
        return umMesAfrente;
      })();

      const filtros: FiltroAgendamento = {
        especialidade: especialidade as string,
        cidade: cidade as string,
        data_inicio: dataInicio,
        data_fim: dataFim
      };

      const vagas = await this.consultasService.buscarVagasDisponiveis(filtros);

      if (vagas.length === 0) {
        res.status(200).json({
          sucesso: true,
          mensagem: 'Não há vagas disponíveis no período solicitado.',
          dados: []
        });
        return;
      }

      res.status(200).json({
        sucesso: true,
        mensagem: `Encontradas ${vagas.length} vagas disponíveis.`,
        dados: vagas
      });
    } catch (error) {
      console.error('[ConsultasController] Erro ao buscar vagas:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor ao buscar vagas.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Agenda uma nova consulta
   * POST /api/consultas/agendar
   */
  public async agendarConsulta(req: Request, res: Response): Promise<void> {
    try {
      const dadosAgendamento: ConsultaAgendamento = req.body;

      // Validações básicas
      if (!dadosAgendamento.paciente?.nome || !dadosAgendamento.paciente?.cpf) {
        res.status(400).json({
          sucesso: false,
          mensagem: 'Nome e CPF do paciente são obrigatórios.'
        });
        return;
      }

      if (!dadosAgendamento.especialidade) {
        res.status(400).json({
          sucesso: false,
          mensagem: 'Especialidade é obrigatória.'
        });
        return;
      }

      const resultado = await this.consultasService.agendarConsulta(dadosAgendamento);

      if (resultado.sucesso) {
        res.status(201).json(resultado);
      } else {
        res.status(400).json(resultado);
      }
    } catch (error) {
      console.error('[ConsultasController] Erro ao agendar consulta:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor ao agendar consulta.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca consultas por CPF
   * GET /api/consultas/paciente/:cpf
   */
  public async buscarConsultasPorCPF(req: Request, res: Response): Promise<void> {
    try {
      const { cpf } = req.params;

      if (!cpf) {
        res.status(400).json({
          sucesso: false,
          mensagem: 'CPF é obrigatório.'
        });
        return;
      }

      const consultas = await this.consultasService.buscarConsultasPorCPF(cpf);

      res.status(200).json({
        sucesso: true,
        mensagem: `Encontradas ${consultas.length} consultas para o CPF ${cpf}.`,
        dados: consultas
      });
    } catch (error) {
      console.error('[ConsultasController] Erro ao buscar consultas por CPF:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor ao buscar consultas.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Busca consulta por protocolo
   * GET /api/consultas/protocolo/:protocolo
   */
  public async buscarConsultaPorProtocolo(req: Request, res: Response): Promise<void> {
    try {
      const { protocolo } = req.params;

      if (!protocolo) {
        res.status(400).json({
          sucesso: false,
          mensagem: 'Protocolo é obrigatório.'
        });
        return;
      }

      const consulta = await this.consultasService.buscarConsultaPorProtocolo(protocolo);

      if (!consulta) {
        res.status(404).json({
          sucesso: false,
          mensagem: 'Consulta não encontrada com esse protocolo.'
        });
        return;
      }

      res.status(200).json({
        sucesso: true,
        mensagem: 'Consulta encontrada.',
        dados: consulta
      });
    } catch (error) {
      console.error('[ConsultasController] Erro ao buscar consulta por protocolo:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor ao buscar consulta.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Cancela uma consulta
   * PUT /api/consultas/cancelar/:protocolo
   */
  public async cancelarConsulta(req: Request, res: Response): Promise<void> {
    try {
      const { protocolo } = req.params;
      const { motivo } = req.body;

      if (!protocolo) {
        res.status(400).json({
          sucesso: false,
          mensagem: 'Protocolo é obrigatório.'
        });
        return;
      }

      const resultado = await this.consultasService.cancelarConsulta(protocolo, motivo);

      if (resultado.sucesso) {
        res.status(200).json(resultado);
      } else {
        res.status(400).json(resultado);
      }
    } catch (error) {
      console.error('[ConsultasController] Erro ao cancelar consulta:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor ao cancelar consulta.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista especialidades disponíveis
   * GET /api/consultas/especialidades
   */
  public async listarEspecialidades(req: Request, res: Response): Promise<void> {
    try {
      const especialidades = await this.consultasService.listarEspecialidades();

      res.status(200).json({
        sucesso: true,
        mensagem: `Encontradas ${especialidades.length} especialidades.`,
        dados: especialidades
      });
    } catch (error) {
      console.error('[ConsultasController] Erro ao listar especialidades:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor ao listar especialidades.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Lista cidades disponíveis
   * GET /api/consultas/cidades
   */
  public async listarCidades(req: Request, res: Response): Promise<void> {
    try {
      const cidades = await this.consultasService.listarCidades();

      res.status(200).json({
        sucesso: true,
        mensagem: `Encontradas ${cidades.length} cidades.`,
        dados: cidades
      });
    } catch (error) {
      console.error('[ConsultasController] Erro ao listar cidades:', error);
      res.status(500).json({
        sucesso: false,
        mensagem: 'Erro interno do servidor ao listar cidades.',
        erro: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}