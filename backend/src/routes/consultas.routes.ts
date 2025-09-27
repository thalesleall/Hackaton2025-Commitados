import { Router } from 'express';
import { ConsultasController } from '../controllers/consultas.controller';

const router = Router();
const consultasController = new ConsultasController();

/**
 * @route GET /api/consultas/vagas-disponiveis
 * @desc Busca vagas disponíveis com filtros opcionais
 * @query {string} especialidade - Especialidade médica
 * @query {string} cidade - Cidade de preferência  
 * @query {string} data_inicio - Data de início da busca (ISO string)
 * @query {string} data_fim - Data de fim da busca (ISO string)
 */
router.get('/vagas-disponiveis', (req, res) => {
  consultasController.buscarVagasDisponiveis(req, res);
});

/**
 * @route POST /api/consultas/agendar
 * @desc Agenda uma nova consulta
 * @body {ConsultaAgendamento} Dados do agendamento
 */
router.post('/agendar', (req, res) => {
  consultasController.agendarConsulta(req, res);
});

/**
 * @route GET /api/consultas/paciente/:cpf
 * @desc Busca todas as consultas de um paciente por CPF
 * @param {string} cpf - CPF do paciente
 */
router.get('/paciente/:cpf', (req, res) => {
  consultasController.buscarConsultasPorCPF(req, res);
});

/**
 * @route GET /api/consultas/protocolo/:protocolo
 * @desc Busca uma consulta específica por protocolo
 * @param {string} protocolo - Protocolo da consulta
 */
router.get('/protocolo/:protocolo', (req, res) => {
  consultasController.buscarConsultaPorProtocolo(req, res);
});

/**
 * @route PUT /api/consultas/cancelar/:protocolo
 * @desc Cancela uma consulta
 * @param {string} protocolo - Protocolo da consulta
 * @body {string} motivo - Motivo do cancelamento (opcional)
 */
router.put('/cancelar/:protocolo', (req, res) => {
  consultasController.cancelarConsulta(req, res);
});

/**
 * @route GET /api/consultas/especialidades
 * @desc Lista todas as especialidades médicas disponíveis
 */
router.get('/especialidades', (req, res) => {
  consultasController.listarEspecialidades(req, res);
});

/**
 * @route GET /api/consultas/cidades
 * @desc Lista todas as cidades onde há atendimento
 */
router.get('/cidades', (req, res) => {
  consultasController.listarCidades(req, res);
});

export { router as consultasRoutes };