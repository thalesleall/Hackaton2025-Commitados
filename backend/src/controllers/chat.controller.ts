// src/controllers/chat.controller.ts

import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { DatabaseService } from '../services/database.service';
import { Message } from '../models/conversation.model';

export class ChatController {
  constructor(
    private chatService: ChatService,
    private databaseService?: DatabaseService
  ) {}

  /**
   * Endpoint POST /chat/message
   * Recebe a mensagem do usuário e salva a conversa no banco de dados
   */
  public async handleUserMessage(req: Request, res: Response): Promise<void> {
    const { message, id_usuario, conversation_id } = req.body;

    if (!message) {
      res.status(400).json({ error: 'message é obrigatório.' });
      return;
    }

    if (!id_usuario) {
      res.status(400).json({ error: 'id_usuario é obrigatório.' });
      return;
    }

    try {
      const result = await this.chatService.processUserMessage(message, id_usuario, conversation_id);
      
      res.json({ 
        reply: result.resposta,
        conversation: {
          id: result.conversation.id_conversa,
          titulo: result.conversation.titulo,
          total_messages: result.conversation.mensagens.length,
          last_updated: result.conversation.data_hora_ultima_mensagem
        }
      });
    } catch (error: any) {
      console.error('Erro no controller handleUserMessage:', error);
      res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
  }

  /**
   * Endpoint POST /chat/message-simple (compatibilidade com versão anterior)
   * Não salva no banco, apenas processa a mensagem
   */
  public async handleUserMessageSimple(req: Request, res: Response): Promise<void> {
    const { message, historico } = req.body;

    if (!message) {
      res.status(400).json({ error: 'message é obrigatório.' });
      return;
    }

    try {
      const historicoMensagens: Message[] | undefined = historico && Array.isArray(historico) ? historico : undefined;
      
      const iaResponse = await this.chatService.processUserMessageSimple(message, historicoMensagens);
      res.json({ reply: iaResponse });
    } catch (error: any) {
      console.error('Erro no controller handleUserMessageSimple:', error);
      res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
  }

  /**
   * Endpoint GET /chat/conversations/:userId
   * Lista conversas de um usuário
   */
  public async getUserConversations(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    if (!userId) {
      res.status(400).json({ error: 'userId é obrigatório.' });
      return;
    }

    try {
      if (!this.databaseService) {
        res.status(501).json({ error: 'DatabaseService não configurado.' });
        return;
      }

      const conversations = await this.databaseService.getUserConversations(userId, parseInt(limit as string));
      
      res.json({
        conversations: conversations.map(conv => ({
          id: conv.id_conversa,
          titulo: conv.titulo,
          created_at: conv.data_hora_inicio,
          updated_at: conv.data_hora_ultima_mensagem,
          total_messages: conv.mensagens.length
        }))
      });
    } catch (error: any) {
      console.error('Erro ao buscar conversas:', error);
      res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
  }

  /**
   * Endpoint GET /chat/conversation/:id
   * Busca uma conversa específica
   */
  public async getConversation(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    if (!id) {
      res.status(400).json({ error: 'ID da conversa é obrigatório.' });
      return;
    }

    try {
      if (!this.databaseService) {
        res.status(501).json({ error: 'DatabaseService não configurado.' });
        return;
      }

      const conversation = await this.databaseService.getConversationById(id);
      
      if (!conversation) {
        res.status(404).json({ error: 'Conversa não encontrada.' });
        return;
      }

      res.json({ conversation });
    } catch (error: any) {
      console.error('Erro ao buscar conversa:', error);
      res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
  }
}