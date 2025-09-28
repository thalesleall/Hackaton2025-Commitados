# 📋 Fluxo de Autorização de Exames

## 🔄 **Funcionamento**

### **1. Iniciando o Fluxo**
- Usuário seleciona opção **"3"** no chatbot
- Sistema apresenta instruções para upload de arquivo PDF

### **2. Upload do Arquivo**
- Frontend faz requisição POST para `/api/chat/upload-autorizacao`
- Middleware valida que é um arquivo PDF (até 40MB)
- Arquivo é processado pelo sistema OCR

### **3. Processamento**
1. **Extração de Texto**: `extractTextFromPdf()` extrai texto do PDF
2. **Busca de Procedimento**: `searchProcedimentoTop()` identifica o exame
3. **Formatação**: Sistema formata a resposta com base na auditoria

### **4. Resposta Formatada**
```
✅ **Autorização de Exame Processada**

📋 **Exame:** BLOQUEIO NEUROLÍTICO DO PLEXO CELÍACO
⏱️ **Auditoria:** 5 dias de auditoria

Digite 0 para voltar ao menu principal.
```

## 🛠️ **Componentes Técnicos**

### **Arquivos Criados/Modificados:**

#### **`autorizacao.service.ts`** ✨ NOVO
```typescript
export class AutorizacaoService {
  async processarExame(filePath: string, lang?: string, dpi?: number): Promise<AutorizacaoResult>
}
```

#### **`chat.service.ts`** 🔄 MODIFICADO
- Adicionado `AutorizacaoService`
- Método `processarAutorizacaoExame()`
- Atualizado `processOtherMenus()` com instruções de upload

#### **`chat.controller.ts`** 🔄 MODIFICADO  
- Método `handleUploadAutorizacao()` para processar uploads

#### **`chat.routes.ts`** 🔄 MODIFICADO
- Rota `POST /api/chat/upload-autorizacao` com middleware `uploadPdf`

## 📋 **Estados de Auditoria**

| Valor | Retorno |
|-------|---------|
| `"0"` | "sem auditoria" |
| `"5"` | "5 dias de auditoria" |
| `"10"` | "10 dias de auditoria" |
| Outro | "{valor} dias de auditoria" |

## 🔌 **Endpoint de Upload**

**POST** `/api/chat/upload-autorizacao`

### Request:
```
Content-Type: multipart/form-data

file: [PDF file]
lang: "por+eng" (opcional)
dpi: 200 (opcional)
```

### Response Success:
```json
{
  "reply": "✅ **Autorização de Exame Processada**...",
  "filename": "pedido.pdf",
  "processed": true
}
```

### Response Error:
```json
{
  "error": "Apenas arquivos PDF são aceitos."
}
```

## ⚠️ **Tratamento de Erros**

1. **Arquivo não enviado**: "Nenhum arquivo foi enviado"
2. **Formato inválido**: "Apenas arquivos PDF são aceitos"
3. **Texto não encontrado**: "Não foi possível extrair texto do arquivo"
4. **Procedimento não identificado**: "Não foi possível identificar o exame"
5. **Erro de processamento**: Detalhes do erro + instruções

## 🎯 **Integração Frontend**

O frontend deve:
1. Detectar quando usuário está no estado `autorizar_exame`
2. Mostrar interface de upload de arquivo
3. Fazer POST para `/api/chat/upload-autorizacao`
4. Exibir a resposta formatada no chat

## ✅ **Status de Implementação**

- ✅ Serviço de autorização
- ✅ Integração OCR + algoritmo de busca  
- ✅ Formatação de resposta
- ✅ Endpoint de upload
- ✅ Tratamento de erros
- ✅ Validação de arquivos
- 🔄 **Pronto para integração no frontend**