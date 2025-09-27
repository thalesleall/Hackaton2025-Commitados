-- ===============================
-- REFATORAÇÃO COMPLETA DO BANCO DE DADOS
-- Sistema de Menu Estruturado com IA apenas para dúvidas
-- ===============================

-- PARTE 1: LIMPEZA E REMOÇÃO DE TABELAS DESNECESSÁRIAS
-- ===============================

-- Remover dados das tabelas que serão alteradas
DELETE FROM consulta WHERE id_consulta IS NOT NULL;
DELETE FROM vaga WHERE id_vaga IS NOT NULL;
DELETE FROM agenda WHERE id_agenda IS NOT NULL;
DELETE FROM conversations WHERE id_conversa IS NOT NULL;
DELETE FROM sessaochat WHERE id_sessao IS NOT NULL;
DELETE FROM recibos WHERE idrecibo IS NOT NULL;

-- Remover tabelas que não serão mais necessárias para este fluxo
DROP TABLE IF EXISTS consulta CASCADE;
DROP TABLE IF EXISTS vaga CASCADE;
DROP TABLE IF EXISTS agenda CASCADE;
DROP TABLE IF EXISTS sessaochat CASCADE;

-- PARTE 2: ADAPTAR TABELA DE CONVERSAS E MENSAGENS
-- ===============================

-- Atualizar estrutura da tabela conversations para o novo fluxo
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS tipo_conversa VARCHAR(20) DEFAULT 'menu',
ADD COLUMN IF NOT EXISTS opcao_selecionada INTEGER,
ADD COLUMN IF NOT EXISTS etapa_atual VARCHAR(50),
ADD COLUMN IF NOT EXISTS dados_temporarios JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS cliente_identificado BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS cpf_cliente VARCHAR(11);

-- Adicionar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_conversations_cpf ON conversations(cpf_cliente);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status_conversa, data_hora_ultima_mensagem);

-- Criar tabela de mensagens para histórico e analytics
CREATE TABLE IF NOT EXISTS mensagens (
  id BIGSERIAL PRIMARY KEY,
  id_conversa BIGINT NOT NULL,
  remetente VARCHAR(20) NOT NULL, -- 'usuario' ou 'bot'
  texto TEXT NOT NULL,
  data_hora TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_mensagem_conversa FOREIGN KEY (id_conversa) REFERENCES conversations(id_conversa) ON DELETE CASCADE
);

-- Índices para a tabela mensagens
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa ON mensagens(id_conversa);
CREATE INDEX IF NOT EXISTS idx_mensagens_data ON mensagens(created_at);
CREATE INDEX IF NOT EXISTS idx_mensagens_remetente ON mensagens(remetente);

-- PARTE 3: CRIAR TABELAS PARA AUTORIZAÇÃO DE EXAMES
-- ===============================

-- Tabela para armazenar solicitações de autorização de exames
CREATE TABLE IF NOT EXISTS autorizacao_exames (
  id_autorizacao BIGSERIAL PRIMARY KEY,
  cpf_paciente VARCHAR(11) NOT NULL,
  nome_paciente VARCHAR(200) NOT NULL,
  codigo_procedimento VARCHAR(20) NOT NULL,
  nome_procedimento VARCHAR(500) NOT NULL,
  medico_solicitante VARCHAR(200),
  crm_medico VARCHAR(20),
  data_solicitacao TIMESTAMP DEFAULT NOW(),
  status_autorizacao VARCHAR(20) DEFAULT 'pendente', -- pendente, autorizado, negado
  numero_autorizacao VARCHAR(50) UNIQUE,
  observacoes TEXT,
  convenio VARCHAR(100),
  data_autorizacao TIMESTAMP,
  validade_autorizacao DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- PARTE 4: CRIAR TABELAS PARA AGENDAMENTO DE EXAMES  
-- ===============================

-- Tabela para disponibilidade de horários para exames
CREATE TABLE IF NOT EXISTS disponibilidade_exames (
  id_disponibilidade BIGSERIAL PRIMARY KEY,
  id_clinica BIGINT NOT NULL,
  tipo_exame VARCHAR(100) NOT NULL,
  data_hora TIMESTAMP NOT NULL,
  vagas_disponiveis INTEGER DEFAULT 1,
  vagas_ocupadas INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'disponivel', -- disponivel, lotado, cancelado
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_disponibilidade_clinica FOREIGN KEY (id_clinica) REFERENCES rede_credenciada(id_clinica)
);

-- Tabela para agendamentos de exames
CREATE TABLE IF NOT EXISTS agendamento_exames (
  id_agendamento BIGSERIAL PRIMARY KEY,
  cpf_paciente VARCHAR(11) NOT NULL,
  nome_paciente VARCHAR(200) NOT NULL,
  id_disponibilidade BIGINT NOT NULL,
  id_clinica BIGINT NOT NULL,
  tipo_exame VARCHAR(100) NOT NULL,
  data_hora TIMESTAMP NOT NULL,
  protocolo_agendamento VARCHAR(30) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'agendado', -- agendado, confirmado, realizado, cancelado
  telefone VARCHAR(20),
  email VARCHAR(200),
  observacoes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT fk_agendamento_disponibilidade FOREIGN KEY (id_disponibilidade) REFERENCES disponibilidade_exames(id_disponibilidade),
  CONSTRAINT fk_agendamento_clinica FOREIGN KEY (id_clinica) REFERENCES rede_credenciada(id_clinica)
);

-- PARTE 5: ÍNDICES PARA PERFORMANCE
-- ===============================

CREATE INDEX IF NOT EXISTS idx_autorizacao_cpf ON autorizacao_exames(cpf_paciente);
CREATE INDEX IF NOT EXISTS idx_autorizacao_status ON autorizacao_exames(status_autorizacao);
CREATE INDEX IF NOT EXISTS idx_autorizacao_data ON autorizacao_exames(data_solicitacao);

CREATE INDEX IF NOT EXISTS idx_disponibilidade_tipo_data ON disponibilidade_exames(tipo_exame, data_hora);
CREATE INDEX IF NOT EXISTS idx_disponibilidade_clinica ON disponibilidade_exames(id_clinica);

CREATE INDEX IF NOT EXISTS idx_agendamento_cpf ON agendamento_exames(cpf_paciente);
CREATE INDEX IF NOT EXISTS idx_agendamento_protocolo ON agendamento_exames(protocolo_agendamento);
CREATE INDEX IF NOT EXISTS idx_agendamento_data ON agendamento_exames(data_hora);

-- PARTE 6: INSERIR DADOS DE TESTE
-- ===============================

-- Inserir tipos de exames disponíveis (usando tabela de procedimentos existente)
INSERT INTO rolprocedimentos (nome, codtuss, tipo, custo) VALUES
('Hemograma Completo', 'HEMO001', 'laboratorio', 25.00),
('Raio X de Tórax', 'RXX001', 'imagem', 45.00),
('Ultrassom Abdominal', 'USG001', 'imagem', 80.00),
('Eletrocardiograma', 'ECG001', 'cardiologia', 35.00),
('Ressonância Magnética', 'RNM001', 'imagem', 350.00),
('Tomografia Computadorizada', 'TC001', 'imagem', 200.00)
ON CONFLICT (codtuss) DO NOTHING;

-- Inserir horários disponíveis para exames (próximos 15 dias)
INSERT INTO disponibilidade_exames (id_clinica, tipo_exame, data_hora, vagas_disponiveis)
SELECT 
  rc.id_clinica,
  rp.nome,
  CURRENT_DATE + (dia || ' days')::INTERVAL + (hora || ' hours')::INTERVAL,
  CASE 
    WHEN rp.tipo = 'laboratorio' THEN 10
    WHEN rp.tipo = 'imagem' THEN 5
    ELSE 3
  END as vagas
FROM rede_credenciada rc
CROSS JOIN rolprocedimentos rp
CROSS JOIN generate_series(1, 15) AS dia  -- 15 dias
CROSS JOIN generate_series(7, 17) AS hora -- 7h às 17h
WHERE rp.tipo IN ('laboratorio', 'imagem', 'cardiologia')
AND EXTRACT(DOW FROM CURRENT_DATE + (dia || ' days')::INTERVAL) BETWEEN 1 AND 5 -- Apenas dias úteis
LIMIT 500; -- Limitar para não criar muitos registros

-- Inserir algumas autorizações de exemplo
INSERT INTO autorizacao_exames (
  cpf_paciente, nome_paciente, codigo_procedimento, nome_procedimento,
  medico_solicitante, crm_medico, status_autorizacao, numero_autorizacao, convenio
) VALUES
('12345678901', 'João Silva', 'HEMO001', 'Hemograma Completo', 'Dr. Carlos Lima', 'CRM12349', 'autorizado', 'AUT240927001', 'Unimed'),
('98765432109', 'Maria Santos', 'RXX001', 'Raio X de Tórax', 'Dra. Ana Oliveira', 'CRM12348', 'pendente', 'AUT240927002', 'Bradesco'),
('11122233344', 'Ana Costa', 'USG001', 'Ultrassom Abdominal', 'Dr. João Silva', 'CRM12345', 'autorizado', 'AUT240927003', 'SulAmérica');

-- PARTE 7: FUNÇÕES ÚTEIS
-- ===============================

-- Função para gerar número de autorização
CREATE OR REPLACE FUNCTION gerar_numero_autorizacao() RETURNS VARCHAR AS $$
DECLARE
    numero VARCHAR;
    existe BOOLEAN;
BEGIN
    LOOP
        numero := 'AUT' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 999)::TEXT, 3, '0');
        SELECT EXISTS(SELECT 1 FROM autorizacao_exames WHERE numero_autorizacao = numero) INTO existe;
        EXIT WHEN NOT existe;
    END LOOP;
    RETURN numero;
END;
$$ LANGUAGE plpgsql;

-- Função para gerar protocolo de agendamento
CREATE OR REPLACE FUNCTION gerar_protocolo_agendamento() RETURNS VARCHAR AS $$
DECLARE
    protocolo VARCHAR;
    existe BOOLEAN;
BEGIN
    LOOP
        protocolo := 'AGD' || TO_CHAR(NOW(), 'YYMMDD') || LPAD(FLOOR(RANDOM() * 9999)::TEXT, 4, '0');
        SELECT EXISTS(SELECT 1 FROM agendamento_exames WHERE protocolo_agendamento = protocolo) INTO existe;
        EXIT WHEN NOT existe;
    END LOOP;
    RETURN protocolo;
END;
$$ LANGUAGE plpgsql;

-- PARTE 8: VIEWS ÚTEIS
-- ===============================

-- View para exames disponíveis
CREATE OR REPLACE VIEW vw_exames_disponiveis AS
SELECT 
  d.id_disponibilidade,
  d.tipo_exame,
  d.data_hora,
  TO_CHAR(d.data_hora, 'DD/MM/YYYY') as data_formatada,
  TO_CHAR(d.data_hora, 'HH24:MI') as hora_formatada,
  (d.vagas_disponiveis - d.vagas_ocupadas) as vagas_livres,
  rc.nome as clinica_nome,
  rc.localizacao as cidade
FROM disponibilidade_exames d
INNER JOIN rede_credenciada rc ON d.id_clinica = rc.id_clinica
WHERE d.status = 'disponivel'
AND (d.vagas_disponiveis - d.vagas_ocupadas) > 0
AND d.data_hora > NOW()
ORDER BY d.data_hora;

-- View para histórico de autorizações
CREATE OR REPLACE VIEW vw_autorizacoes_completas AS
SELECT 
  a.*,
  TO_CHAR(a.data_solicitacao, 'DD/MM/YYYY HH24:MI') as data_solicitacao_formatada,
  CASE 
    WHEN a.validade_autorizacao IS NOT NULL THEN TO_CHAR(a.validade_autorizacao, 'DD/MM/YYYY')
    ELSE NULL
  END as validade_formatada
FROM autorizacao_exames a;

-- PARTE 9: COMPATIBILIDADE E ALIASES
-- ===============================

-- Criar view para compatibilidade entre 'conversations' e 'conversas'
CREATE OR REPLACE VIEW conversas AS
SELECT 
  id_conversa as id,
  id_usuario,
  status_conversa as status_atual,
  opcao_selecionada as opcao_menu_atual,
  data_hora_ultima_mensagem as ultimo_acesso,
  created_at,
  tipo_conversa,
  etapa_atual,
  dados_temporarios,
  cliente_identificado,
  cpf_cliente,
  mensagens
FROM conversations;

-- PARTE 10: TRIGGERS
-- ===============================

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar triggers
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at 
    BEFORE UPDATE ON conversations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_autorizacao_updated_at ON autorizacao_exames;
CREATE TRIGGER update_autorizacao_updated_at 
    BEFORE UPDATE ON autorizacao_exames 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_agendamento_updated_at ON agendamento_exames;
CREATE TRIGGER update_agendamento_updated_at 
    BEFORE UPDATE ON agendamento_exames 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger para tabela mensagens
DROP TRIGGER IF EXISTS update_mensagens_updated_at ON mensagens;
CREATE TRIGGER update_mensagens_updated_at 
    BEFORE UPDATE ON mensagens 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- PARTE 11: VERIFICAÇÕES FINAIS
-- ===============================

-- Verificar se tudo foi criado corretamente
SELECT 'Autorizações cadastradas:' as info, COUNT(*) as quantidade FROM autorizacao_exames
UNION ALL
SELECT 'Exames disponíveis:', COUNT(*) FROM vw_exames_disponiveis
UNION ALL
SELECT 'Procedimentos cadastrados:', COUNT(*) FROM rolprocedimentos
UNION ALL
SELECT 'Clínicas ativas:', COUNT(*) FROM rede_credenciada;

-- ===============================
-- ESTRUTURA PRONTA PARA O NOVO SISTEMA
-- ===============================

COMMIT;