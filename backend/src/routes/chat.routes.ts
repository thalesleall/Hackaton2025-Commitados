// src/routes/chat.routes.ts

import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';

const chatRouter = Router();

// Instancia o controller 
const chatController = new ChatController();

// ENDPOINT ÚNICO - Controle total por texto
// A primeira mensagem inicia a conversa automaticamente
// Digite "0" a qualquer momento para voltar ao menu principal
chatRouter.post('/message', (req, res) => chatController.processMessage(req, res));

export default chatRouter;