// src/controllers/chat.controller.ts

import { Request, Response } from 'express';
import { MenuChatService } from '../services/menu-chat.service';

export class ChatController {
  private menuChatService: MenuChatService;

  constructor() {
    this.menuChatService = new MenuChatService();
  }

  /**
   * ENDPOINT ÚNICO - Processa qualquer mensagem de texto
   * A primeira mensagem inicia automaticamente a conversa
   * Digitar "0" a qualquer momento volta ao menu principal
   * POST /chat/message
   */
  public async processMessage(req: Request, res: Response): Promise<void> {
    try {
      const { idUsuario, mensagem } = req.body;

      // Validação dos parâmetros obrigatórios
      if (!idUsuario || mensagem === undefined || mensagem === null) {
        res.status(400).json({ 
          sucesso: false,
          erro: 'idUsuario e mensagem são obrigatórios' 
        });
        return;
      }

      // Processa a mensagem através do MenuChatService
      // Se for a primeira mensagem, inicia automaticamente a conversa
      const resposta = await this.menuChatService.processarMensagem(idUsuario, mensagem.toString().trim());

      res.status(200).json({
        sucesso: true,
        resposta: resposta,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[ChatController] Erro ao processar mensagem:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Desculpe, ocorreu um erro. Tente novamente ou digite 0 para voltar ao menu.',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }
}