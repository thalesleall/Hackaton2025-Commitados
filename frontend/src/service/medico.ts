import axios from 'axios';

axios.get('https://localhost:3000/api/medicos')
  .then(response => {
    console.log(response.data); // Exibe os dados dos médicos recebidos da API
  })
  .catch(error => {
    console.error('Ocorreu um erro!', error);
  });