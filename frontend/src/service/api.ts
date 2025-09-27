import axios from 'axios';
const url = 'http://localhost:3000';

export const LoginUsuario = async (email: string, senha: string) => {

    if (!email || !senha) {
        throw new Error("E-mail ou senha esta faltando!");
    }

    const response = await axios.post(`${url}/api/chat/login`, { email,senha});

    return response.data;
}

export const CarregarConversas = async (userId: string) => {

    if (!userId) {
        throw new Error("O id do usuario esta faltando!");
    }

    const response = await axios.get(`${url}/api/chat/conversations/${userId}`);

    return response.data;
}

export const CarregarMensagens = async (userId: string) => {

    if (!userId) {
        throw new Error("O id do usuario esta faltando!");
    }

    const response = await axios.get(`${url}/api/chat/conversations/${userId}`);

    return response.data;
}

export const CarregarUsuario = async (userId: string) => {

    if (!userId) {
        throw new Error("O id do usuario esta faltando!");
    }

    const response = await axios.get(`${url}/api/chat/user/${userId}`);

    return response.data;
}
