# Sistema de Agendamento Simples - Documentação

## Visão Geral

O sistema de agendamento simples foi implementado para a **Opção 2** do chatbot. Ele utiliza um switch case para coletar os dados do usuário passo a passo e verificar no banco de dados para dar opções ao usuário.

## Fluxo do Sistema

### 1. **ESPECIALIDADE** (Primeiro passo)
- Busca todas as especialidades disponíveis na tabela `medicos`
- Remove duplicatas e exibe lista numerada
- Usuário digita o número da especialidade desejada

### 2. **MEDICO** (Segundo passo)
- Busca médicos da especialidade selecionada
- Exibe lista com nome e cidade do médico
- Usuário digita o número do médico desejado

### 3. **DATA_HORARIO** (Terceiro passo)
- Busca horários disponíveis na tabela `agenda_medicos`
- Filtra por:
  - `medico_id` do médico selecionado
  - `disponivel = true`
  - `data_disponivel >= hoje`
- Exibe até 10 horários mais próximos
- Usuário digita o número do horário desejado

### 4. **DADOS_PACIENTE** (Quarto passo)
- Solicita dados do paciente no formato:
  - Nome, Telefone, Data de Nascimento (DD/MM/AAAA), Motivo da consulta
- Valida o formato da data de nascimento
- Exemplo: `João Silva, (11) 99999-9999, 01/01/1990, Consulta de rotina`

### 5. **CONFIRMACAO** (Último passo)
- Exibe resumo completo do agendamento
- Usuário digita **CONFIRMAR** ou **CANCELAR**
- Se confirmado:
  - Gera protocolo automático (`AGD` + timestamp)
  - Insere na tabela `agendamentos`
  - Marca horário como indisponível (`disponivel = false`)
  - Exibe protocolo para o usuário

## Estrutura do Banco de Dados

### Tabelas Utilizadas

```sql
-- Médicos disponíveis
medicos (id, nome, especialidade, cidade)

-- Agenda dos médicos
agenda_medicos (id, medico_id, data_disponivel, horario_inicio, horario_fim, disponivel)

-- Agendamentos realizados
agendamentos (id, protocolo, medico_id, agenda_id, paciente_nome, paciente_telefone, 
             data_agendamento, horario, status, paciente_data_nascimento, motivo_consulta)
```

## Implementação Técnica

### Arquivos Criados/Modificados

1. **`src/services/agendamento-simples.service.ts`** (NOVO)
   - Classe `AgendamentoSimplesService`
   - Interface `AgendamentoStep`
   - Método principal: `processarAgendamento()`

2. **`src/services/chat.service.ts`** (MODIFICADO)
   - Importação do novo serviço
   - Novo estado `agendamento` no menu
   - Método `processAgendamento()`
   - Atualização do `determineMenuState()`

3. **`src/models/conversation.model.ts`** (MODIFICADO)
   - Novo estado `agendamento` no `menu_state`
   - Nova propriedade `agendamento_step`

### Switch Case Principal

```typescript
switch (step.step) {
  case 'ESPECIALIDADE': return await this.handleEspecialidadeStep(step, userInput);
  case 'MEDICO': return await this.handleMedicoStep(step, userInput);
  case 'DATA_HORARIO': return await this.handleDataHorarioStep(step, userInput);
  case 'DADOS_PACIENTE': return await this.handleDadosPacienteStep(step, userInput);
  case 'CONFIRMACAO': return await this.handleConfirmacaoStep(step, userInput);
  default: return await this.iniciarFluxo();
}
```

## Características do Sistema

### ✅ **Vantagens**
- **Simples e linear**: Fluxo passo a passo fácil de entender
- **Validação em tempo real**: Cada entrada é validada imediatamente
- **Integração com banco**: Usa dados reais das tabelas
- **Protocolo automático**: Gera identificador único para cada agendamento
- **Estado persistente**: Mantém progresso na conversa
- **Voltar ao menu**: Comando "0" sempre disponível

### ⚠️ **Validações Implementadas**
- Números de opção válidos em cada step
- Formato de data de nascimento (DD/MM/AAAA)
- Disponibilidade de horários em tempo real
- Confirmação explícita antes de finalizar

### 🔄 **Fluxo de Estados**
```
MENU → Opção 2 → ESPECIALIDADE → MEDICO → DATA_HORARIO → DADOS_PACIENTE → CONFIRMACAO → MENU
```

## Exemplo de Uso

1. Usuário: `2` (seleciona agendamento)
2. Sistema: Lista especialidades disponíveis
3. Usuário: `1` (seleciona primeira especialidade)
4. Sistema: Lista médicos da especialidade
5. Usuário: `2` (seleciona segundo médico)
6. Sistema: Lista horários disponíveis do médico
7. Usuário: `3` (seleciona terceiro horário)
8. Sistema: Solicita dados do paciente
9. Usuário: `Maria Silva, (11) 98765-4321, 15/03/1985, Consulta de rotina`
10. Sistema: Exibe resumo e solicita confirmação
11. Usuário: `CONFIRMAR`
12. Sistema: Agenda consulta e exibe protocolo

## Tratamento de Erros

- **Entrada inválida**: Solicita nova entrada com instruções claras
- **Banco de dados**: Retorna ao menu principal em caso de erro
- **Dados faltando**: Cada step valida entradas necessárias
- **Horário indisponível**: Atualiza lista em tempo real

O sistema está pronto para uso e totalmente integrado ao chatbot existente!