// src/services/autorizacao.service.ts
import { extractTextFromPdf } from './ocr.service';
import { searchProcedimentoTop } from './sortingAlgorithm';

export interface AutorizacaoResult {
  exame: string;
  auditoria: string;
  dataResposta?: string;
}

export class AutorizacaoService {
  /**
   * Processa um arquivo PDF e retorna informações sobre autorização
   */
  async processarExame(filePath: string, lang?: string, dpi?: number): Promise<AutorizacaoResult | null> {
    try {
      // 1. Extrair texto do PDF
      console.log('[AutorizacaoService] Extraindo texto do PDF:', filePath);
      const result = await extractTextFromPdf(filePath, { lang, dpi });
      
      if (!result.text || result.text.trim().length === 0) {
        throw new Error('Não foi possível extrair texto do arquivo');
      }

      // 2. Buscar procedimento
      console.log('[AutorizacaoService] Buscando procedimento no texto extraído');
      const response = await searchProcedimentoTop(result.text.split('\n'));

      if (!response) {
        return null; // Nenhum procedimento encontrado
      }

      // 3. Formatar resposta
      const auditoriaDias = this.formatarAuditoria(response.auditoria);
      const dataResposta = this.calcularDataResposta(response.auditoria);
      
      return {
        exame: response.valor,
        auditoria: auditoriaDias,
        dataResposta: dataResposta
      };

    } catch (error) {
      console.error('[AutorizacaoService] Erro ao processar exame:', error);
      throw error;
    }
  }

  /**
   * Formatar texto de auditoria baseado no número
   */
  private formatarAuditoria(auditoria: string | null): string {
    if (!auditoria) return 'sem auditoria';

    const numero = parseInt(auditoria, 10);
    
    switch (numero) {
      case 0:
        return 'sem auditoria';
      case 5:
        return '5 dias de auditoria';
      case 10:
        return '10 dias de auditoria';
      default:
        return `${numero} dias de auditoria`;
    }
  }

  /**
   * Calcular data de resposta baseada na auditoria
   */
  private calcularDataResposta(auditoria: string | null): string | undefined {
    if (!auditoria) return undefined;

    const numero = parseInt(auditoria, 10);
    
    // Se for 0 (sem auditoria), já está aprovado
    if (numero === 0) {
      return undefined;
    }

    // Calcular data de resposta (hoje + dias de auditoria)
    const hoje = new Date();
    const dataResposta = new Date(hoje);
    dataResposta.setDate(hoje.getDate() + numero);

    // Formatar data em português brasileiro
    const opcoes: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    };

    return dataResposta.toLocaleDateString('pt-BR', opcoes);
  }
}