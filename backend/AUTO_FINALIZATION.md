# ⏰ Sistema de Finalização Automática por Inatividade

## 🎯 **Funcionamento**

O sistema agora **finaliza conversas automaticamente após 10 minutos de inatividade**, evitando sessões "fantasma" abertas indefinidamente.

## ⚙️ **Como Funciona**

### **1. Detecção de Inatividade**
```
Última mensagem há > 10 minutos = Conversa Inativa
```

### **2. Verificação Automática**
- **A cada nova mensagem:** Verifica se a conversa atual está inativa
- **A cada 5 minutos:** Limpeza automática de conversas inativas no cache
- **Ao buscar conversa:** Verifica inatividade antes de retornar

### **3. Comportamento ao Detectar Inatividade**
```
Usuário envia mensagem em conversa inativa (>10min)
↓
Sistema detecta inatividade
↓
Cria NOVA conversa automaticamente
↓
Mostra mensagem informativa + menu principal
```

## 📱 **Experiência do Usuário**

### **Cenário Normal:**
```
14:00 - Usuário: "oi"
14:00 - Bot: [Menu principal]
14:05 - Usuário: "1" 
14:05 - Bot: [Modo IA ativado]
14:07 - Usuário: "estou com febre"
14:07 - Bot: [Resposta da IA]
```

### **Cenário com Inatividade:**
```
14:00 - Usuário: "oi"
14:00 - Bot: [Menu principal]
14:05 - Usuário: "1"
14:05 - Bot: [Modo IA ativado]
--- 15 minutos depois ---
14:20 - Usuário: "ainda estou aqui"
14:20 - Bot: "⏰ Sua sessão anterior foi finalizada por inatividade (10 minutos).
              [Menu principal]"
```

## 🔧 **Implementação Técnica**

### **Verificação de Inatividade:**
```typescript
// 10 minutos = 10 * 60 * 1000 ms
const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
const isInactive = conversation.data_hora_ultima_mensagem < tenMinutesAgo;
```

### **Limpeza Automática:**
```typescript
// A cada 5 minutos, verifica e limpa conversas inativas
setInterval(() => {
  this.checkAndFinalizeInactiveConversations();
}, 5 * 60 * 1000);
```

### **Estados de Conversa:**
- **`aberta`** - Conversa ativa (< 10 min da última mensagem)
- **`fechada`** - Conversa finalizada por inatividade (>= 10 min)

## 📊 **Logs do Sistema**

### **Logs Informativos:**
```
[ChatService] Conversa abc123 inativa há mais de 10 minutos. Iniciando nova conversa.
[DB] Encontradas 3 conversas inativas para finalizar
[DB] 2 conversas removidas do cache por inatividade
[DB] Conversa def456 marcada como fechada por inatividade
```

## 🧪 **Como Testar**

### **Teste 1: Inatividade Simulada**
```bash
# 1. Iniciar conversa
curl -X POST http://localhost:3000/api/chat/message \
  -d '{"message": "oi", "id_usuario": "test123"}'

# 2. Escolher opção 1
curl -X POST http://localhost:3000/api/chat/message \
  -d '{"message": "1", "id_usuario": "test123", "conversation_id": "ID"}'

# 3. Simular inatividade (alterar timestamp no banco ou aguardar 10min)

# 4. Enviar nova mensagem
curl -X POST http://localhost:3000/api/chat/message \
  -d '{"message": "ainda aqui", "id_usuario": "test123", "conversation_id": "ID"}'
  
# Resultado esperado: Mensagem de sessão finalizada + menu
```

### **Teste 2: Verificação de Cache**
```bash
# Verificar logs para confirmar limpeza automática
# Logs devem aparecer a cada 5 minutos
```

## ⚡ **Benefícios**

### **Para o Sistema:**
- ✅ **Reduz uso de memória** (cache limpo automaticamente)
- ✅ **Evita conversas "fantasma"** abertas indefinidamente  
- ✅ **Melhora performance** (menos dados para processar)
- ✅ **Gestão automática** (sem intervenção manual)

### **Para o Usuário:**
- ✅ **Experiência clara** (sabe quando sessão expirou)
- ✅ **Recomeço automático** (não precisa fazer nada especial)
- ✅ **Informação transparente** (aviso sobre os 10 minutos)

## 🔄 **Compatibilidade**

### **API Mantida:**
- ✅ Mesmo endpoint: `POST /api/chat/message`
- ✅ Mesmo formato de request/response
- ✅ Frontend não precisa mudar nada

### **Comportamento:**
- ✅ **Conversas ativas:** Funcionam normalmente
- ✅ **Conversas inativas:** Reiniciam automaticamente no menu
- ✅ **Estados persistidos:** Apenas dados essenciais salvos no banco

## 🎛️ **Configuração**

### **Tempo de Inatividade:**
```typescript
// Para alterar o tempo de inatividade (atual: 10 min)
const INACTIVITY_TIMEOUT = 10 * 60 * 1000; // ms

// Para alterar frequência de limpeza (atual: 5 min)
const CLEANUP_INTERVAL = 5 * 60 * 1000; // ms
```

### **Personalização de Mensagens:**
```typescript
// Mensagem de sessão expirada
"⏰ Sua sessão anterior foi finalizada por inatividade (10 minutos)."

// Aviso no menu
"ℹ️ Sua sessão será finalizada automaticamente após 10 minutos de inatividade."
```

---

**O sistema agora gerencia conversas de forma inteligente, finalizando automaticamente sessões inativas e proporcionando uma experiência mais limpa e eficiente!** ⚡