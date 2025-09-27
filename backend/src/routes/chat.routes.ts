// src/routes/chat.routes.ts

import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { ChatService } from '../services/chat.service';
import { DatabaseService } from '../services/database.service';
import { IaService } from '../services/IA.service';

const chatRouter = Router();

// Instancie os services e o controller para injetar no router
const databaseService = new DatabaseService();
const iaService = new IaService();
const chatService = new ChatService(databaseService, iaService);
const chatController = new ChatController(chatService, databaseService);

// Definir as rotas
chatRouter.post('/message', (req, res) => chatController.handleUserMessage(req, res));
chatRouter.get('/conversations/:userId', (req, res) => chatController.getLatestConversation(req, res));

export default chatRouter;