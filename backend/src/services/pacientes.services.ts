// src/services/paciente.service.ts
import { createClient } from '@supabase/supabase-js';
import { Paciente } from '../models/Paciente.model';

const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_ANON_KEY as string
);

//  Service responsável pela lógica de negócio da entidade Paciente.*/
export class PacienteService {
    
    // Lógica para Listar Todos
    public async listarTodos(): Promise<Paciente[]> {
        const { data, error } = await supabase
            .from('pacientes')
            .select('*');

        if (error) {
            throw new Error(`Erro ao buscar pacientes: ${error.message}`);
        }
        return data as Paciente[];
    }

    // Lógica para Buscar por ID
    public async buscarPorId(id: number): Promise<Paciente | null> {
        const { data, error } = await supabase
            .from('pacientes')
            .select('*')
            .eq('id_paciente', id)
            .single();

        if (error) {
            throw new Error(`Erro ao buscar paciente: ${error.message}`);
        }
        return data as Paciente | null;
    }

    // Lógica para Atualizar
    public async atualizar(id: number, dados: Partial<Paciente>): Promise<Paciente | null> {
        const { data, error } = await supabase
            .from('pacientes')
            .update(dados)
            .eq('id_paciente', id)
            .select('*')
            .single();

        if (error) {
            throw new Error(`Erro ao atualizar paciente: ${error.message}`);
        }
        return data as Paciente | null;
    }
    // Lógica para Deletar
    public async deletar(id: number): Promise<boolean> {
        const { error } = await supabase
            .from('pacientes')
            .delete()
            .eq('id_paciente', id);

        if (error) {
            throw new Error(`Erro ao deletar paciente: ${error.message}`);
        }
        return true;
    }
}
