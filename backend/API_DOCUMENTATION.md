# 📡 API de Chat com Persistência no Supabase

## 🗃️ Estrutura do Banco de Dados

### Tabela: `conversations`
```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario TEXT NOT NULL,
    titulo TEXT,
    mensagens JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## 🚀 Endpoints da API

### 1. **POST /api/chat/message** (Principal - com persistência)

Envia mensagem e salva a conversa no banco de dados.

**Request:**
```json
{
  "message": "Estou com dor de cabeça há 2 dias",
  "id_usuario": "user123",
  "conversation_id": "uuid-da-conversa" // opcional
}
```

**Response:**
```json
{
  "reply": "Compreendo sua preocupação. A dor de cabeça há 2 dias pode ter várias causas...",
  "conversation": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "titulo": "Estou com dor de cabeça há 2 dias",
    "total_messages": 4,
    "last_updated": "2025-09-27T15:30:00.000Z"
  }
}
```

### 2. **POST /api/chat/message-simple** (Compatibilidade - sem persistência)

Processa mensagem sem salvar no banco (mantém compatibilidade com versão anterior).

**Request:**
```json
{
  "message": "Como está o tempo?",
  "historico": [
    {
      "remetente": "usuario",
      "texto": "Olá",
      "data_hora": "2025-09-27T15:00:00.000Z"
    },
    {
      "remetente": "chatbot", 
      "texto": "Olá! Como posso ajudar?",
      "data_hora": "2025-09-27T15:00:30.000Z"
    }
  ]
}
```

**Response:**
```json
{
  "reply": "Não tenho informações sobre o tempo em tempo real..."
}
```

### 3. **GET /api/chat/conversations/:userId**

Lista conversas de um usuário.

**Parâmetros:**
- `userId` (path): ID do usuário
- `limit` (query, opcional): Máximo de conversas (padrão: 10)

**Response:**
```json
{
  "conversations": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "titulo": "Consulta sobre dor de cabeça",
      "created_at": "2025-09-27T14:00:00.000Z",
      "updated_at": "2025-09-27T15:30:00.000Z",
      "total_messages": 8
    },
    {
      "id": "550e8400-e29b-41d4-a716-446655440001", 
      "titulo": "Agendamento de consulta",
      "created_at": "2025-09-26T10:00:00.000Z",
      "updated_at": "2025-09-26T10:15:00.000Z",
      "total_messages": 6
    }
  ]
}
```

### 4. **GET /api/chat/conversation/:id**

Busca uma conversa específica com todas as mensagens.

**Response:**
```json
{
  "conversation": {
    "id_usuario": "user123",
    "id_conversa": "550e8400-e29b-41d4-a716-446655440000",
    "titulo": "Consulta sobre dor de cabeça",
    "data_hora_inicio": "2025-09-27T14:00:00.000Z",
    "data_hora_ultima_mensagem": "2025-09-27T15:30:00.000Z",
    "status_conversa": "aberta",
    "mensagens": [
      {
        "remetente": "usuario",
        "texto": "Estou com dor de cabeça há 2 dias",
        "data_hora": "2025-09-27T14:00:00.000Z"
      },
      {
        "remetente": "chatbot",
        "texto": "Compreendo sua preocupação...",
        "data_hora": "2025-09-27T14:00:30.000Z"
      }
    ]
  }
}
```

## 🔄 Fluxo de Uso

### **Novo Chat:**
```javascript
// 1. Primeira mensagem (cria nova conversa)
const response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Estou com febre",
    id_usuario: "user123"
  })
});

const data = await response.json();
const conversationId = data.conversation.id;
```

### **Continuando Chat:**
```javascript
// 2. Mensagens seguintes (usa conversation_id)
const response2 = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "A febre está em 38.5°C",
    id_usuario: "user123",
    conversation_id: conversationId
  })
});
```

### **Listar Conversas:**
```javascript
// 3. Buscar conversas do usuário
const conversations = await fetch('/api/chat/conversations/user123');
const convList = await conversations.json();
```

## ⚙️ Configuração

### Variáveis de Ambiente (.env):
```bash
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
HUGGINGFACE_API_KEY=sua_hf_api_key_aqui
```

### Aplicar Schema no Supabase:
1. Acesse o **SQL Editor** no dashboard do Supabase
2. Execute o conteúdo do arquivo `database/simple_schema.sql`
3. Verifique se a tabela `conversations` foi criada

## 🛡️ Recursos Automáticos

### ✅ **Funcionalidades Implementadas:**
- **Auto-save:** Toda mensagem é automaticamente salva
- **Histórico:** Contexto da conversa é mantido automaticamente
- **Títulos:** Gerados automaticamente a partir da primeira mensagem
- **Timestamps:** `created_at` e `updated_at` atualizados automaticamente
- **UUIDs:** IDs únicos gerados automaticamente

### ✅ **Estrutura de Dados:**
- **Mensagens:** Armazenadas como JSONB para flexibilidade
- **Índices:** Otimizados para buscas por usuário e data
- **Triggers:** Atualização automática de `updated_at`

## 🔧 Troubleshooting

### **Problema: Erro 400 "id_usuario é obrigatório"**
- Certifique-se de incluir o campo `id_usuario` no body da requisição

### **Problema: Erro 501 "DatabaseService não configurado"**
- Verifique se as variáveis `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão configuradas

### **Problema: Conversa não é salva**
- Verifique os logs do servidor para erros de conexão com Supabase
- Confirme se a tabela `conversations` foi criada corretamente

### **Testando a conexão:**
```bash
# No terminal, dentro da pasta backend
npm run dev

# Teste básico
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "teste", "id_usuario": "user123"}'
```

## 📊 Monitoramento

### Logs no Console:
```
[DB] Nova conversa criada no Supabase: uuid para user123
[DB] Conversa atualizada: uuid com 4 mensagens
[ChatService] Conversa salva no banco: uuid
```

### Verificar no Supabase:
1. Dashboard → Table Editor → conversations
2. Visualizar dados inseridos
3. Monitorar logs de API em Real-time → Logs