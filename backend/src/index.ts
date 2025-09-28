import 'dotenv/config'; // carrega variáveis do .env
import express from "express";
import router from './router';
import cors from 'cors';



const app = express();
app.use(cors());
app.use(express.json());

app.use("/api", router);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
