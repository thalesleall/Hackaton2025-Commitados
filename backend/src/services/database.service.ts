// src/services/database.service.ts

import { Conversation, Message } from '../models/conversation.model';
import { supabase } from '../config/bd';

export class DatabaseService {
  private cache: Map<string, Conversation> = new Map(); // Cache em memória para conversas ativas

  constructor() {
    console.log('DatabaseService inicializado com Supabase.');
    
    // Limpeza automática de conversas inativas a cada 5 minutos
    setInterval(() => {
      this.checkAndFinalizeInactiveConversations();
    }, 5 * 60 * 1000);
  }

  /**
   * Busca a conversa mais recente de um usuário
   */
  public async findLatestConversationByUserId(idUsuario: string): Promise<Conversation | null> {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('id_usuario', idUsuario)
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
   * Verifica e finaliza conversas inativas há mais de 10 minutos
   */
  public async checkAndFinalizeInactiveConversations(): Promise<number> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, updated_at')
        .lt('updated_at', tenMinutesAgo.toISOString());

      if (error) {
        console.error('[DB] Erro ao buscar conversas inativas:', error);
        return 0;
      }

      if (!data || data.length === 0) {
        return 0;
      }

      console.log(`[DB] Encontradas ${data.length} conversas inativas para finalizar`);
      
      // Não precisamos atualizar nada no banco, apenas limpar do cache
      let finalizadas = 0;
      for (const conv of data) {
        if (this.cache.has(conv.id)) {
          this.cache.delete(conv.id);
          finalizadas++;
        }
      }

      console.log(`[DB] ${finalizadas} conversas removidas do cache por inatividade`);
      return finalizadas;

    } catch (error) {
      console.error('[DB] Erro ao finalizar conversas inativas:', error);
      return 0;
    }
  }

  /**
   * Verifica se uma conversa está inativa (mais de 10 minutos)
   */
  public isConversationInactive(conversation: Conversation): boolean {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return conversation.data_hora_ultima_mensagem < tenMinutesAgo;
  }

  /**
   * Converte dados do banco para o modelo da aplicação
   */
  private convertFromDatabase(data: any): Conversation {
    const conversation = {
      id_usuario: data.id_usuario,
      id_conversa: data.id,
      titulo: data.titulo,
      data_hora_inicio: new Date(data.created_at),
      data_hora_ultima_mensagem: new Date(data.updated_at),
      status_conversa: 'aberta', // Padrão, já que não temos esse campo na tabela
      mensagens: data.mensagens?.map((msg: any) => ({
        remetente: msg.remetente,
        texto: msg.texto,
        data_hora: new Date(msg.data_hora)
      })) || []
    } as Conversation;

    // Verifica se a conversa está inativa e marca como finalizada
    if (this.isConversationInactive(conversation)) {
      conversation.status_conversa = 'fechada';
      console.log(`[DB] Conversa ${conversation.id_conversa} marcada como fechada por inatividade`);
    }

    return conversation;
  }
}