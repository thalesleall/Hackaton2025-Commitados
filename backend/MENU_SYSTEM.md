# 🎯 Sistema de Menu de Atendimento - Implementado

## 🚀 **Sistema Implementado**

O endpoint `POST /api/chat/message` agora possui um **sistema de menu inteligente** que intercepta as mensagens antes da IA.

## 📋 **Fluxo de Navegação**

### **1. Menu Principal (Primeira Interação)**
```
Usuário: [qualquer mensagem]
↓
Bot: "Olá! Como posso ajudá-lo hoje?

1. Tirar dúvidas (Com IA)
2. Agendar consulta  
3. Autorizar exame

Digite o número da opção desejada ou 0 para voltar ao menu."
```

### **2. Navegação por Números**
```
Usuário: "1"  →  Ativa Modo IA
Usuário: "2"  →  Sistema de Agendamento  
Usuário: "3"  →  Sistema de Autorização
Usuário: "0"  →  Volta ao Menu Principal (de qualquer lugar)
```

### **3. Opção 1 - Modo IA**
```
Usuário: "1"
↓
Bot: "🤖 Modo IA ativado! Agora você pode fazer perguntas..."
↓
Usuário: "Estou com dor de cabeça"
↓ 
Bot: [Resposta da IA + "Digite 0 para voltar ao menu"]
```

### **4. Opções 2 e 3 - Scripts Simples**
```
Usuário: "2"
↓
Bot: "📅 Agendamento de Consulta
Em breve você será direcionado...
Digite 0 para voltar ao menu principal."
```

## 🔧 **Como Testar**

### **1. Iniciar Nova Conversa:**
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "oi", "id_usuario": "test123"}'
```

**Resposta esperada:** Menu principal

### **2. Escolher Opção 1 (IA):**
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "1", "id_usuario": "test123", "conversation_id": "ID_DA_CONVERSA"}'
```

**Resposta esperada:** Ativação do modo IA

### **3. Fazer Pergunta para IA:**
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "Estou com febre", "id_usuario": "test123", "conversation_id": "ID_DA_CONVERSA"}'
```

**Resposta esperada:** Resposta da IA + instrução para voltar (0)

### **4. Voltar ao Menu:**
```bash
curl -X POST http://localhost:3000/api/chat/message \
  -H "Content-Type: application/json" \
  -d '{"message": "0", "id_usuario": "test123", "conversation_id": "ID_DA_CONVERSA"}'
```

**Resposta esperada:** Menu principal novamente

## 📱 **Exemplo Frontend (JavaScript)**

```javascript
// 1. Iniciar conversa
let response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "olá",
    id_usuario: "user123"
  })
});

let data = await response.json();
console.log(data.reply); // Menu principal
const conversationId = data.conversation.id;

// 2. Escolher opção 1 (IA)
response = await fetch('/api/chat/message', {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "1",
    id_usuario: "user123",
    conversation_id: conversationId
  })
});

data = await response.json();
console.log(data.reply); // Modo IA ativado

// 3. Fazer pergunta para IA
response = await fetch('/api/chat/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: "Estou com dor de cabeça há 2 dias",
    id_usuario: "user123", 
    conversation_id: conversationId
  })
});

data = await response.json();
console.log(data.reply); // Resposta da IA
```

## ⚙️ **Funcionalidades Técnicas**

### **Estados do Menu:**
- `menu`: Menu principal
- `ia_mode`: Modo IA ativado  
- `agendar_consulta`: Sistema de agendamento
- `autorizar_exame`: Sistema de autorização

### **Filtros Inteligentes:**
- **Para IA:** Remove mensagens de menu e números de opção
- **Persistência:** Estado do menu NÃO é salvo no banco
- **Reset:** Sempre inicia no menu principal em nova conversa

### **Tratamento de Erros:**
- **Opção inválida:** Mostra menu novamente
- **Erro na IA:** Volta automaticamente ao menu
- **Input não numérico:** Tratado como opção inválida no menu

## 🔄 **Compatibilidade**

### **Endpoints Mantidos:**
- ✅ `POST /api/chat/message` - Agora com menu
- ✅ `POST /api/chat/message-simple` - Sem menu (IA direta)
- ✅ `GET /api/chat/conversations/:userId` - Listar conversas
- ✅ `GET /api/chat/conversation/:id` - Buscar conversa

### **Formato da API:**
```json
// Request (mesmo formato)
{
  "message": "1",
  "id_usuario": "user123", 
  "conversation_id": "uuid-opcional"
}

// Response (mesmo formato)
{
  "reply": "🤖 Modo IA ativado!...",
  "conversation": {
    "id": "uuid",
    "titulo": "Menu de Atendimento", 
    "total_messages": 4,
    "last_updated": "2025-09-27T15:30:00.000Z"
  }
}
```

## 🎯 **Próximos Passos**

1. **Testar** o sistema com frontend
2. **Implementar submenus** nas opções 2 e 3
3. **Adicionar validações** específicas 
4. **Melhorar UX** com emojis e formatação
5. **Métricas** de uso por opção