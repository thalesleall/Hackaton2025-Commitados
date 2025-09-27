import axios from 'axios';
const url = 'http://localhost:3000';

export const LoginUsuario = async (email: string, senha: string) => {

    if (!email || !senha) {
        throw new Error("Login is missing at service!");
    }

    const response = await axios.post(`${url}/signIn`, { email,senha});

    return response.data;
}