// src/controllers/menu-chat.controller.ts

import { Request, Response } from 'express';
import { MenuChatService } from '../services/menu-chat.service';
import { DatabaseService } from '../services/database.service';
import { supabase } from '../config/bd';

export class MenuChatController {
  private menuChatService: MenuChatService;
  private databaseService: DatabaseService;

  constructor() {
    this.menuChatService = new MenuChatService();
    this.databaseService = new DatabaseService();
  }

  /**
   * Processa mensagem no sistema de menu estruturado
   * POST /chat/message
   */
  public async processMessage(req: Request, res: Response): Promise<void> {
    try {
      const { idUsuario, mensagem } = req.body;

      // Validação dos parâmetros obrigatórios
      if (!idUsuario || !mensagem) {
        res.status(400).json({ 
          sucesso: false,
          erro: 'idUsuario e mensagem são obrigatórios' 
        });
        return;
      }

      // Processa a mensagem através do MenuChatService
      const resposta = await this.menuChatService.processarMensagem(idUsuario, mensagem);

      res.status(200).json({
        sucesso: true,
        resposta: resposta,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[MenuChatController] Erro ao processar mensagem:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Erro interno do servidor',
        detalhes: error instanceof Error ? error.message : 'Erro desconhecido'
      });
    }
  }

  /**
   * Inicia uma nova conversa (mostra menu principal)
   * POST /chat/iniciar
   */
  public async iniciarConversa(req: Request, res: Response): Promise<void> {
    try {
      const { idUsuario } = req.body;

      if (!idUsuario) {
        res.status(400).json({ 
          sucesso: false,
          erro: 'idUsuario é obrigatório' 
        });
        return;
      }

      // Inicia nova conversa mostrando o menu
      const resposta = await this.menuChatService.processarMensagem(idUsuario, 'menu');

      res.status(200).json({
        sucesso: true,
        resposta: resposta,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('[MenuChatController] Erro ao iniciar conversa:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obtém o histórico de uma conversa
   * GET /chat/historico/:idConversa
   */
  public async obterHistorico(req: Request, res: Response): Promise<void> {
    try {
      const { idConversa } = req.params;

      if (!idConversa) {
        res.status(400).json({ 
          sucesso: false,
          erro: 'idConversa é obrigatório' 
        });
        return;
      }

      // Busca a conversa pelo ID
      const conversa = await this.menuChatService.obterConversa(idConversa);

      if (!conversa) {
        res.status(404).json({
          sucesso: false,
          erro: 'Conversa não encontrada'
        });
        return;
      }

      res.status(200).json({
        sucesso: true,
        conversa: conversa
      });

    } catch (error) {
      console.error('[MenuChatController] Erro ao obter histórico:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Lista conversas de um usuário
   * GET /chat/conversas/:idUsuario
   */
  public async listarConversas(req: Request, res: Response): Promise<void> {
    try {
      const { idUsuario } = req.params;
      const { limite = 10, offset = 0 } = req.query;

      if (!idUsuario) {
        res.status(400).json({ 
          sucesso: false,
          erro: 'idUsuario é obrigatório' 
        });
        return;
      }

      // Converter para números e usar métodos nativos do Supabase
      const offsetNum = parseInt(offset as string) || 0;
      const limiteNum = parseInt(limite as string) || 10;
      
      const { data: conversas, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('id_usuario', idUsuario)
        .order('data_hora_ultima_mensagem', { ascending: false })
        .range(offsetNum, offsetNum + limiteNum - 1);

      if (error) {
        throw new Error(`Erro ao buscar conversas: ${error.message}`);
      }

      res.status(200).json({
        sucesso: true,
        conversas: conversas || []
      });

    } catch (error) {
      console.error('[MenuChatController] Erro ao listar conversas:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Encerra uma conversa
   * POST /chat/encerrar
   */
  public async encerrarConversa(req: Request, res: Response): Promise<void> {
    try {
      const { idUsuario, idConversa } = req.body;

      if (!idUsuario) {
        res.status(400).json({ 
          sucesso: false,
          erro: 'idUsuario é obrigatório' 
        });
        return;
      }

      // Se idConversa não for fornecido, encerra a conversa ativa
      let conversaQuery: string;
      let params: any[];

      if (idConversa) {
        conversaQuery = `
          UPDATE conversas 
          SET status_atual = 'encerrada', ultimo_acesso = NOW() 
          WHERE id = $1 AND id_usuario = $2
        `;
        params = [idConversa, idUsuario];
      } else {
        conversaQuery = `
          UPDATE conversas 
          SET status_atual = 'encerrada', ultimo_acesso = NOW() 
          WHERE id_usuario = $1 AND status_atual = 'ativa'
        `;
        params = [idUsuario];
      }

      // Simplificar para usar métodos nativos do Supabase
      if (idConversa) {
        const { error } = await supabase
          .from('conversations')
          .update({ status_conversa: 'encerrada' })
          .eq('id_conversa', idConversa)
          .eq('id_usuario', idUsuario);
        
        if (error) throw new Error(`Erro ao encerrar conversa: ${error.message}`);
      } else {
        const { error } = await supabase
          .from('conversations')
          .update({ status_conversa: 'encerrada' })
          .eq('id_usuario', idUsuario)
          .eq('status_conversa', 'aberta');
        
        if (error) throw new Error(`Erro ao encerrar conversas: ${error.message}`);
      }

      res.status(200).json({
        sucesso: true,
        mensagem: 'Conversa encerrada com sucesso'
      });

    } catch (error) {
      console.error('[MenuChatController] Erro ao encerrar conversa:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Obtém estatísticas do chatbot
   * GET /chat/estatisticas
   */
  public async obterEstatisticas(req: Request, res: Response): Promise<void> {
    try {
      // Estatísticas simplificadas usando métodos nativos do Supabase
      const { data: conversas, error: conversasError } = await supabase
        .from('conversations')
        .select('id_conversa, id_usuario, created_at, data_hora_ultima_mensagem');

      if (conversasError) {
        throw new Error(`Erro ao buscar conversas: ${conversasError.message}`);
      }

      const usuariosUnicos = new Set(conversas?.map(c => c.id_usuario) || []).size;
      const totalConversas = conversas?.length || 0;

      res.status(200).json({
        sucesso: true,
        estatisticas: {
          usuarios_unicos: usuariosUnicos,
          total_conversas: totalConversas,
          total_mensagens: 0, // Simplificado
          duracao_media_segundos: 0 // Simplificado
        }
      });

    } catch (error) {
      console.error('[MenuChatController] Erro ao obter estatísticas:', error);
      res.status(500).json({ 
        sucesso: false,
        erro: 'Erro interno do servidor'
      });
    }
  }
}