# Hackaton 2025 - Commitados 🚀

Projeto desenvolvido durante a **9ª edição do Hackathon Uni-FACEF (2025)** pela equipe **Commitados**. A solução foi pensada para trazer inovação com foco em acessibilidade, automação e integração de serviços.

---

## 📂 Estrutura do Projeto

```
Hackaton2025-Commitados-main/
│── backend/       # API em Node.js + TypeScript
│── frontend/      # Interface em React + Vite
│── DOCUMENTAÇÃO.pdf # Documento oficial do projeto
```

### 🔹 Backend (Node.js + TypeScript)

* Entrada principal: `src/index.ts`
* Rotas centralizadas em: `src/router.ts`
* Configuração do banco: `src/config/bd.ts`
* Controllers implementados:

  * `auth.controller.ts` → autenticação
  * `chat.controller.ts` → chatbot e interação
  * `ocr.controller.ts` → reconhecimento de texto (OCR)
  * `sort.controller.ts` → organização e ordenação de dados
* Variáveis de ambiente: `.env.example`

### 🔹 Frontend (React + Vite + TypeScript)

* Entrada principal: `src/main.tsx`
* Componente raiz: `src/App.tsx`
* Componentes principais:

  * `chatbot.tsx` → interface do chatbot
  * `DropDown.tsx` → menus interativos
  * `AccessibilityContext.tsx` → acessibilidade
* Configuração: `vite.config.ts`

---

## ⚙️ Tecnologias Utilizadas

### Backend

* Node.js
* TypeScript
* Express.js
* Nodemon

### Frontend

* React.js
* Vite
* TypeScript
* Context API

---

## 🚀 Como Rodar o Projeto

### Pré-requisitos

* **Node.js** >= 18
* **npm** ou **yarn**

### 1️⃣ Clonar o repositório

```bash
git clone https://github.com/thalesleall/Hackaton2025-Commitados.git
cd Hackaton2025-Commitados-main
```

### 2️⃣ Rodar o Backend

```bash
cd backend
npm install
cp .env.example .env   # configurar variáveis de ambiente
npm run dev
```

Servidor será iniciado em: `http://localhost:3000`

### 3️⃣ Rodar o Frontend

```bash
cd frontend
npm install
npm run dev
```

Aplicação disponível em: `http://localhost:5173`

---

## 📖 Documentação

Todo o detalhamento da solução e objetivos do projeto estão disponíveis em **DOCUMENTAÇÃO.pdf** na raiz do repositório.

---

## 👨‍💻 Equipe Commitados

* Thales Leal
* Diego Murari
* João Pedro Rosa de Paula
* Gabriel Storti

---

## 🏆 Resultado

Projeto premiado em **3º lugar** no Hackathon Uni-FACEF 2025 🎉

---

## 📜 Licença

Este projeto foi desenvolvido para fins acadêmicos durante o Hackathon Uni-FACEF 2025. Uso livre para estudo e demonstração.
