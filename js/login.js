import { CONFIG } from './config.js';

async function login(event) {
    event.preventDefault(); 

    const user = document.getElementById("username").value; 
    const pass = document.getElementById("password").value; 

    try {
        const resposta = await fetch(`${CONFIG.API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: user, senha: pass }) 
        });

        const dados = await resposta.json();

        if (dados.sucesso) {
            sessionStorage.setItem('argos_auth', dados.token);
            window.location.href = 'index.html';
        } else {
            alert("Usuário ou senha incorretos.");
        }
    } catch (erro) {
        console.error(erro);
        alert("Erro de conexão com o servidor.");
    }
}

document.getElementById('btn-login').addEventListener('click', login);