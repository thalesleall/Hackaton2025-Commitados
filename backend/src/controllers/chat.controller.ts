// src/controllers/chat.controller.ts

import { Request, Response } from 'express';
import { ChatService } from '../services/chat.service';
import { DatabaseService } from '../services/database.service'; // Para a rota de debug

export class ChatController {
  private chatService: ChatService;
  private databaseService: DatabaseService; // Apenas para a rota de debug/listar conversas

  constructor(chatService: ChatService, databaseService: DatabaseService) {
    this.chatService = chatService;
    this.databaseService = databaseService;
  }

  /**
   * Endpoint POST /chat/message
   * Recebe a mensagem do usuário, processa com o ChatService e retorna a resposta da IA.
   */
  public async handleUserMessage(req: Request, res: Response): Promise<void> {
    const { userId, message } = req.body;

    if (!userId || !message) {
      res.status(400).json({ error: 'userId e message são obrigatórios.' });
      return;
    }

    try {
      const iaResponse = await this.chatService.processUserMessage(userId, message);
      res.json({ reply: iaResponse });
    } catch (error: any) {
      console.error('Erro no controller handleUserMessage:', error);
      res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
  }

  /**
   * Endpoint GET /chat/conversations/:userId
   * Retorna a conversa mais recente de um usuário (para debug/histórico).
   */
  public async getLatestConversation(req: Request, res: Response): Promise<void> {
    const { userId } = req.params;

    try {
      const conversation = await this.databaseService.findLatestConversationByUserId(userId);
      if (conversation) {
        res.json(conversation);
      } else {
        res.status(404).json({ message: 'Nenhuma conversa encontrada para este usuário.' });
      }
    } catch (error: any) {
      console.error('Erro no controller getLatestConversation:', error);
      res.status(500).json({ error: error.message || 'Erro interno do servidor.' });
    }
  }
}