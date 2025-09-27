// src/services/paciente.service.ts

import { Paciente } from '../models/Paciente.model';

// --- Simulação do Banco de Dados (Repository) ---
let dbPacientes: Paciente[] = [];
let nextId = 1;
// ------------------------------------------------

/**
 * Service responsável pela lógica de negócio da entidade Paciente.
 * Em um projeto real, esta camada interagiria com o Repositório/ORM.
 */
export class PacienteService {

    // Lógica para Criar Paciente
    public criar(dados: Paciente): Paciente {
        // Lógica de negócio: validar CPF, aplicar regras de nível de necessidade, etc.
        if (!dados.nome || !dados.cpf) {
            // Em um service real, lançaríamos uma exceção de negócio
            throw new Error('Nome e CPF são obrigatórios.');
        }

        // Simulação de inserção no BD
        const novoPaciente: Paciente = {
            id_paciente: nextId++,
            nome: dados.nome,
            cpf: dados.cpf,
            dataNascimento: dados.dataNascimento,
            idNivelNecessidade: dados.idNivelNecessidade
        };
        
        dbPacientes.push(novoPaciente);
        return novoPaciente;
    }

    // Lógica para Listar Todos
    public listarTodos(): Paciente[] {
        // Lógica de negócio: aplicar paginação, filtros de segurança, etc.
        return dbPacientes;
    }

    // Lógica para Buscar por ID
    public buscarPorId(id: number): Paciente | undefined {
        // Simulação de busca no BD
        const paciente = dbPacientes.find(p => p.id_paciente === id);
        return paciente;
    }

    // Lógica para Atualizar
    public atualizar(id: number, dados: Partial<Paciente>): Paciente | undefined {
        const index = dbPacientes.findIndex(p => p.id_paciente === id);
        
        if (index === -1) {
            return undefined; // Não encontrado
        }

        // Simulação de atualização no BD
        dbPacientes[index] = { ...dbPacientes[index], ...dados, id_paciente: id };
        
        return dbPacientes[index];
    }

    // Lógica para Deletar
    public deletar(id: number): boolean {
        const initialLength = dbPacientes.length;
        
        // Simulação de remoção no BD
        dbPacientes = dbPacientes.filter(p => p.id_paciente !== id);

        return dbPacientes.length < initialLength; // Retorna true se algo foi deletado
    }
}