-- Schema simples para conversas com IA
-- Execute este SQL na interface web do Supabase (SQL Editor)

CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario TEXT NOT NULL,
    titulo TEXT,
    mensagens JSONB NOT NULL DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para buscar conversas por usuário
CREATE INDEX IF NOT EXISTS idx_conversations_usuario 
ON conversations(id_usuario);

-- Índice para ordenar por data de atualização
CREATE INDEX IF NOT EXISTS idx_conversations_updated 
ON conversations(updated_at DESC);

-- Trigger para atualizar automaticamente o campo updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE OR REPLACE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Exemplo de dados (opcional - para testar)
-- INSERT INTO conversations (id_usuario, titulo, mensagens) VALUES 
-- ('user123', 'Teste de conversa', '[
--   {"remetente": "usuario", "texto": "Olá", "data_hora": "2025-09-27T10:00:00.000Z"},
--   {"remetente": "chatbot", "texto": "Olá! Como posso ajudar?", "data_hora": "2025-09-27T10:00:30.000Z"}
-- ]'::jsonb);