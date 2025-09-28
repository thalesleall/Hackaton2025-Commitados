// src/routes/chat.routes.ts

import { Router } from 'express';
import { ChatController } from '../controllers/chat.controller';
import { ChatService } from '../services/chat.service';
import { IaService } from '../services/IA.service';
import { DatabaseService } from '../services/database.service';
import { uploadPdf } from '../middlewares/upload.middleware';

const chatRouter = Router();

// Instancie os services e o controller para injetar no router
const iaService = new IaService();
const databaseService = new DatabaseService();
const chatService = new ChatService(iaService, databaseService);
const chatController = new ChatController(chatService, databaseService);

// Definir as rotas
chatRouter.post('/message', (req, res) => chatController.handleUserMessage(req, res));
chatRouter.post('/message-simple', (req, res) => chatController.handleUserMessageSimple(req, res));
chatRouter.post('/upload-autorizacao', uploadPdf, (req, res) => chatController.handleUploadAutorizacao(req, res));
chatRouter.get('/conversations/:userId', (req, res) => chatController.getUserConversations(req, res));
chatRouter.get('/conversation/:id', (req, res) => chatController.getConversation(req, res));

export default chatRouter;