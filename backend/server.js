const express = require('express');
const mqtt = require("mqtt");
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

const ESTACOES = [

    {
        id: 1,
        nome: "Estação 001",
        latitude: -22.2473,
        longitude: -45.731,
        status: "normal",
        ultimaAtualizacao: null
    },

    {
        id: 2,
        nome: "Estação 002",
        latitude: -22.3961,
        longitude: -45.737,
        status: "normal",
        ultimaAtualizacao: null
    },

    {
        id: 3,
        nome: "Estação 003",
        latitude: -22.2500,
        longitude: -45.619,
        status: "normal",
        ultimaAtualizacao: null
    },

    {
        id: 4,
        nome: "Estação 004",
        latitude: -22.2627,
        longitude: -45.805,
        status: "normal",
        ultimaAtualizacao: null
    }

];

const DADOS_SENSORES = {

    1: {
        temperatura: null,
        umidade: null,
        pluviometria: null,
        velocidadeVento: null,
        nivelRio: null,
        timestamp: null
    },

    2: {
        temperatura: null,
        umidade: null,
        pluviometria: null,
        velocidadeVento: null,
        nivelRio: null,
        timestamp: null
    },

    3: {
        temperatura: null,
        umidade: null,
        pluviometria: null,
        velocidadeVento: null,
        nivelRio: null,
        timestamp: null
    },

    4: {
        temperatura: null,
        umidade: null,
        pluviometria: null,
        velocidadeVento: null,
        nivelRio: null,
        timestamp: null
    }

};

const ALERTAS = {

    1: [],
    2: [],
    3: [],
    4: []

};

let REDE_CONEXOES = [

    {
        de: 1,
        para: 2,
        qualidade: "desconhecida",
        ultimaAtualizacao: null
    },

    {
        de: 1,
        para: 3,
        qualidade: "desconhecida",
        ultimaAtualizacao: null
    },

    {
        de: 1,
        para: 4,
        qualidade: "desconhecida",
        ultimaAtualizacao: null
    },

    {
        de: 2,
        para: 3,
        qualidade: "desconhecida",
        ultimaAtualizacao: null
    },

    {
        de: 2,
        para: 4,
        qualidade: "desconhecida",
        ultimaAtualizacao: null
    },

    {
        de: 3,
        para: 4,
        qualidade: "desconhecida",
        ultimaAtualizacao: null
    }

];

// TESTES (MQTT)

app.get("/api/estacoes", (req, res) => {res.json(ESTACOES);});

app.get("/api/estacoes/:id", (req, res) => {
    const id = Number(req.params.id);
    const estacao = ESTACOES.find(estacao => estacao.id === id);

    if (!estacao) {
        return res.status(404).json({
            erro: "Estação não encontrada"
        });
    }
    res.json(estacao);
});

app.get("/api/sensores/:id", (req, res) => {
    const id = Number(req.params.id);
    const dados = DADOS_SENSORES[id];
    if (!dados) {
        return res.status(404).json({
            erro: "Dados da estação não encontrados"
        });
    }
    res.json(dados);
});

app.get("/api/alertas/:id", (req, res) => {
    const id = Number(req.params.id);
    if (!ALERTAS[id]) {
        return res.status(404).json({
            erro: "Estação não encontrada"
        });
    }
    res.json(ALERTAS[id]);
});

app.get("/api/alertas", (req, res) => {res.json(ALERTAS);});
app.get("/api/rede", (req, res) => {res.json(REDE_CONEXOES);});

let clienteMQTT = null;

// CONEXÃO MQTT
function conectarMQTT() {

    const mqttEnabled = process.env.MQTT_ENABLED === "true";

    if (!mqttEnabled) {
        console.log(
            "MQTT desativado. API iniciada sem conexão ao broker."
        );
        return;
    }

    const host = process.env.MQTT_HOST;

    if (!host) {
        console.error(
            "MQTT_HOST não configurado."
        );
        return;
    }

    const url = `mqtt://${host}`;
    console.log(`Tentando conectar ao MQTT: ${url}`);

    clienteMQTT = mqtt.connect(url, {
        username: process.env.MQTT_USERNAME || undefined,
        password: process.env.MQTT_PASSWORD || undefined,
        reconnectPeriod: 5000,
        connectTimeout: 10000
    });

    clienteMQTT.on("connect", () => {
        console.log("Conectado ao broker MQTT.");
        const topico =process.env.MQTT_TOPIC || "argos/#";
        clienteMQTT.subscribe(
            topico,
            (erro) => {
                if (erro) {
                    console.error(
                        "Erro ao assinar tópico MQTT:",
                        erro.message
                    );
                    return;
                }

                console.log(`Inscrito no tópico: ${topico}`);
            }
        );
    });


    clienteMQTT.on(
        "message",
        (topico, mensagem) => {
            try {
                const dados = JSON.parse(mensagem.toString());
                console.log("MQTT recebido:",topico,dados);
                processarMensagemMQTT(topico,dados);
            }

            catch (erro) {
                console.error(
                    "Erro ao processar mensagem MQTT:",
                    erro.message
                );
            }
        }
    );

    clienteMQTT.on("error", (erro) => {
        console.error("Erro MQTT:",erro.message);
    });

    clienteMQTT.on("reconnect", () => {
        console.log("Tentando reconectar ao broker MQTT...");
    });

    clienteMQTT.on("offline", () => {
        console.log("Broker MQTT offline.");
    });
}

function processarMensagemMQTT(topico, dados) {
    console.log(
        "Processando mensagem MQTT:",topico
    );
}

// Iniciar o servidor
const porta = process.env.PORTA || 3000;
app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);

    conectarMQTT();
});