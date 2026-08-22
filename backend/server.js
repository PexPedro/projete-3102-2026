const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());

// Configuração do CORS para bloquear acessos de outras portas
const corsOptions = {
    origin: 'http://127.0.0.1:5500', // Substitua pela URL/Porta exata do seu frontend
    optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Função para calcular o hash SHA-256 no backend
function gerarHash(senha) {
    return crypto.createHash('sha256').update(senha).digest('hex');
}

// Rota de login
app.post('/api/login', (req, res) => {
    const { usuario, senha } = req.body;
    
    const hashDigitado = gerarHash(senha);
    const usuarioValido = process.env.USUARIO_VALIDO;
    const hashCorreto = process.env.HASH_SENHA;

    if (usuario === usuarioValido && hashDigitado === hashCorreto) {
        return res.json({ sucesso: true });
    } else {
        return res.status(401).json({ sucesso: false });
    }
});

// Iniciar o servidor
const porta = process.env.PORTA || 3000;
app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
});