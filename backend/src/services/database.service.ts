// src/services/database.service.ts

import { Conversation, Message } from '../models/conversation.model';
import { supabase } from '../config/bd';

export class DatabaseService {
  constructor() {
    console.log('DatabaseService inicializado com Supabase.');
  }

  public async findLatestConversationByUserId(idUsuario: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id_usuario', idUsuario)
      .order('data_hora_ultima_mensagem', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[DB Supabase] Erro ao buscar conversa:', error);
      throw new Error(`Erro ao buscar conversa para o usuário ${idUsuario}: ${error.message}`);
    }

    if (!data) return null;

    // Converte datas de string ISO para objetos Date
    // **** CORREÇÃO PRINCIPAL AQUI ****
    return {
      ...data,
      data_hora_inicio: new Date(data.data_hora_inicio),
      data_hora_ultima_mensagem: new Date(data.data_hora_ultima_mensagem),
      // Adicionado o .map para converter as datas DENTRO das mensagens também
      mensagens: data.mensagens.map((msg: any) => ({
        ...msg,
        data_hora: new Date(msg.data_hora)
      })) as Message[]
    } as Conversation;
  }

  public async createConversation(idUsuario: string, primeiraMensagem: string): Promise<Conversation> {
    const now = new Date();
    const newConversationData = {
      id_usuario: idUsuario,
      data_hora_inicio: now.toISOString(),
      data_hora_ultima_mensagem: now.toISOString(),
      status_conversa: 'aberta',
      mensagens: [{ remetente: 'usuario', texto: primeiraMensagem, data_hora: now.toISOString() }],
    };

    const { data, error } = await supabase
      .from('conversations')
      .insert([newConversationData])
      .select()
      .single();

    if (error) {
      console.error('[DB Supabase] Erro ao criar conversa:', error);
      throw new Error(`Erro ao criar nova conversa: ${error.message}`);
    }

    console.log(`[DB] Nova conversa criada no Supabase: ${data.id_conversa} para ${idUsuario}`);
    return {
        ...data,
        data_hora_inicio: new Date(data.data_hora_inicio),
        data_hora_ultima_mensagem: new Date(data.data_hora_ultima_mensagem),
        mensagens: data.mensagens.map((msg: any) => ({
            ...msg,
            data_hora: new Date(msg.data_hora)
        })) as Message[]
    } as Conversation;
  }

  public async updateConversation(conversation: Conversation): Promise<Conversation> {
    const now = new Date();
    const updatedConversationData = {
      data_hora_ultima_mensagem: now.toISOString(),
      status_conversa: conversation.status_conversa,
      mensagens: conversation.mensagens.map(msg => ({
          ...msg,
          // Aqui a conversão para string está correta, pois estamos ENVIANDO para o DB
          data_hora: msg.data_hora.toISOString()
      })),
      updated_at: now.toISOString()
    };

    const { data, error } = await supabase
      .from('conversations')
      .update(updatedConversationData)
      .eq('id_conversa', conversation.id_conversa)
      .select()
      .single();

    if (error) {
      console.error('[DB Supabase] Erro ao atualizar conversa:', error);
      throw new Error(`Erro ao atualizar conversa ${conversation.id_conversa}: ${error.message}`);
    }

    return {
        ...data,
        data_hora_inicio: new Date(data.data_hora_inicio),
        data_hora_ultima_mensagem: new Date(data.data_hora_ultima_mensagem),
        mensagens: data.mensagens.map((msg: any) => ({
            ...msg,
            data_hora: new Date(msg.data_hora)
        })) as Message[]
    } as Conversation;
  }
}