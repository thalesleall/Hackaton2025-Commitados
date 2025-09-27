// src/controllers/paciente.controller.ts

import { Request, Response } from 'express';
import { PacienteService } from '../services/pacientes.services';
import { Paciente } from '../models/Paciente.model';

// Instância única do Service
const pacienteService = new PacienteService();

export class PacienteController {

    // GET (Listar Todos)
    public async listarPacientes(req: Request, res: Response): Promise<Response> {
        try {
            const pacientes = await pacienteService.listarTodos();
            return res.status(200).json(pacientes);
        } catch (error) {
            console.error('Erro ao listar pacientes:', (error as Error).message);
            return res.status(500).json({ error: 'Falha interna ao listar pacientes.' });
        }
    }

    // GET (Buscar por ID)
    public async buscarPacientePorId(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.idPaciente);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID de paciente inválido.' });
            }

            const paciente = await pacienteService.buscarPorId(id);
            
            if (!paciente) {
                return res.status(404).json({ error: 'Paciente não encontrado.' });
            }
            
            return res.status(200).json(paciente);
        } catch (error) {
            console.error('Erro ao buscar paciente por ID:', (error as Error).message);
            return res.status(500).json({ error: 'Falha interna ao buscar paciente.' });
        }
    }

    // PUT (Atualizar)
    public async atualizarPaciente(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.idPaciente);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID de paciente inválido.' });
            }

            const dadosAtualizados: Partial<Paciente> = req.body;
            
            const pacienteAtualizado = await pacienteService.atualizar(id, dadosAtualizados);
            
            if (!pacienteAtualizado) {
                 // Supabase retorna null se não encontrar e atualizar, então tratamos como 404
                return res.status(404).json({ error: 'Paciente não encontrado.' });
            }
            
            return res.status(200).json(pacienteAtualizado);
        } catch (error) {
            console.error('Erro ao atualizar paciente:', (error as Error).message);
            return res.status(500).json({ error: 'Falha interna ao atualizar paciente.' });
        }
    }

    // DELETE (Deletar)
    public async deletarPaciente(req: Request, res: Response): Promise<Response> {
        try {
            const id = parseInt(req.params.idPaciente);
            if (isNaN(id)) {
                return res.status(400).json({ error: 'ID de paciente inválido.' });
            }

            // O service deleta e lança erro se houver falha no Supabase
            await pacienteService.deletar(id);

            // Se chegou aqui, o Supabase não retornou erro. Retorna 204 No Content.
            return res.status(204).send(); 
        } catch (error) {
            console.error('Erro ao deletar paciente:', (error as Error).message);
            return res.status(500).json({ error: 'Falha interna ao deletar paciente.' });
        }
    }
}