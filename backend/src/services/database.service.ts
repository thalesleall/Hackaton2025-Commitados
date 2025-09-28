// src/services/database.service.ts

import { Conversation, Message } from '../models/conversation.model';
import { supabase } from '../config/bd';

export class DatabaseService {
  private cache: Map<string, Conversation> = new Map(); // Cache em memória para conversas ativas

  constructor() {
    console.log('DatabaseService inicializado com Supabase.');
  }

  /**
   * Busca a conversa mais recente de um usuário
   */
  public async findLatestConversationByUserId(idUsuario: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id_usuario', idUsuario)
      .eq('status', 'aberta')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[DB Supabase] Erro ao buscar conversa:', error);
      throw new Error(`Erro ao buscar conversa para o usuário ${idUsuario}: ${error.message}`);
    }

    if (!data) return null;

    return this.convertFromDatabase(data);
  }

  /**
   * Busca uma conversa específica pelo ID
   */
  public async getConversationById(conversationId: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('[DB Supabase] Erro ao buscar conversa:', error);
      throw new Error(`Erro ao buscar conversa ${conversationId}: ${error.message}`);
    }

    if (!data) return null;

    return this.convertFromDatabase(data);
  }

  /**
   * Lista conversas de um usuário
   */
  public async getUserConversations(idUsuario: string, limit: number = 10): Promise<Conversation[]> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id_usuario', idUsuario)
      .order('updated_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[DB Supabase] Erro ao buscar conversas:', error);
      throw new Error(`Erro ao buscar conversas do usuário ${idUsuario}: ${error.message}`);
    }

    return data?.map(conv => this.convertFromDatabase(conv)) || [];
  }

  /**
   * Cria uma nova conversa
   */
  public async createConversation(idUsuario: string, primeiraMensagem: string): Promise<Conversation> {
    const now = new Date();
    const titulo = primeiraMensagem.length > 50 
      ? primeiraMensagem.substring(0, 47) + '...' 
      : primeiraMensagem;

    const newConversationData = {
      id_usuario: idUsuario,
      titulo: titulo,
      mensagens: [{
        remetente: 'usuario',
        texto: primeiraMensagem,
        data_hora: now.toISOString()
      }]
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

    console.log(`[DB] Nova conversa criada no Supabase: ${data.id} para ${idUsuario}`);
    return this.convertFromDatabase(data);
  }

  /**
   * Atualiza uma conversa existente (salva todas as mensagens)
   */
  public async updateConversation(conversation: Conversation): Promise<Conversation> {
    const updatedConversationData = {
      titulo: conversation.titulo,
      mensagens: conversation.mensagens.map(msg => ({
        remetente: msg.remetente,
        texto: msg.texto,
        data_hora: msg.data_hora.toISOString()
      }))
    };

    const { data, error } = await supabase
      .from('conversations')
      .update(updatedConversationData)
      .eq('id', conversation.id_conversa)
      .select()
      .single();

    if (error) {
      console.error('[DB Supabase] Erro ao atualizar conversa:', error);
      throw new Error(`Erro ao atualizar conversa ${conversation.id_conversa}: ${error.message}`);
    }

    console.log(`[DB] Conversa atualizada: ${data.id} com ${conversation.mensagens.length} mensagens`);
    return this.convertFromDatabase(data);
  }

  /**
   * Salva uma conversa (cria se não existe, atualiza se existe)
   */
  public async saveConversation(conversation: Conversation): Promise<Conversation> {
    // Se tem ID, tenta atualizar
    if (conversation.id_conversa && conversation.id_conversa !== `temp-${Date.now()}`) {
      try {
        return await this.updateConversation(conversation);
      } catch (error) {
        console.log('[DB] Conversa não encontrada para atualizar, criando nova...');
      }
    }

    // Se não tem ID ou falhou ao atualizar, cria nova
    const firstUserMessage = conversation.mensagens.find(msg => msg.remetente === 'usuario');
    if (!firstUserMessage) {
      throw new Error('Não foi possível encontrar mensagem do usuário para criar conversa');
    }

    return await this.createConversation(conversation.id_usuario, firstUserMessage.texto);
  }

  /**
   * Fecha uma conversa permanentemente
   */
  public async closeConversation(conversationId: string): Promise<void> {
    const { error } = await supabase
      .from('conversations')
      .update({ 
        status: 'fechada',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (error) {
      console.error('[DB Supabase] Erro ao fechar conversa:', error);
      throw new Error(`Erro ao fechar conversa ${conversationId}: ${error.message}`);
    }

    // Remove do cache
    if (this.cache.has(conversationId)) {
      this.cache.delete(conversationId);
    }

    console.log(`[DB] Conversa ${conversationId} fechada com sucesso`);
  }



  /**
   * Converte dados do banco para o modelo da aplicação
   */
  private convertFromDatabase(data: any): Conversation {
    return {
      id_usuario: data.id_usuario,
      id_conversa: data.id,
      titulo: data.titulo,
      data_hora_inicio: new Date(data.created_at),
      data_hora_ultima_mensagem: new Date(data.updated_at),
      status_conversa: data.status || 'aberta', // Pega do banco ou padrão aberta
      mensagens: data.mensagens?.map((msg: any) => ({
        remetente: msg.remetente,
        texto: msg.texto,
        data_hora: new Date(msg.data_hora)
      })) || []
    } as Conversation;
  }
}