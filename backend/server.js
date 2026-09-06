const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors({ origin: 'http://127.0.0.1:5500', optionsSuccessStatus: 200 }));

const estado = {
    estacoes: [
        { id: 1, nome: "Estação 001", latitude: -22.2473, longitude: -45.731, status: "normal" },
        { id: 2, nome: "Estação 002", latitude: -22.3961, longitude: -45.737, status: "normal" },
        { id: 3, nome: "Estação 003", latitude: -22.2500, longitude: -45.619, status: "normal" },
        { id: 4, nome: "Estação 004", latitude: -22.2627, longitude: -45.805, status: "normal" }
    ],
    sensores: { 1: {}, 2: {}, 3: {}, 4: {} },
    alertas: { 1: [], 2: [], 3: [], 4: [] },
    previsoes: { 1: null, 2: null, 3: null, 4: null } // Estado independente para as previsões da IA
};

// Fila para armazenar as leituras que chegam rápido do MQTT
const filaMensagens = {
    1: []
};

function verificarAutenticacao(req, res, next) {
    if (req.headers['authorization'] === process.env.API_TOKEN) return next();
    return res.status(401).json({ erro: "Não autorizado" });
}

app.post('/api/login', (req, res) => {
    const hashDigitado = crypto.createHash('sha256').update(req.body.senha).digest('hex');
    if (req.body.usuario === process.env.USUARIO_VALIDO && hashDigitado === process.env.HASH_SENHA) {
        return res.json({ sucesso: true, token: process.env.API_TOKEN });
    }
    return res.status(401).json({ sucesso: false });
});

// =========================================================
// ROTA 1: DASHBOARD (Consome a fila de sensores originais)
// =========================================================
app.get('/api/dashboard', verificarAutenticacao, (req, res) => {
    const dadosParaEnviar = JSON.parse(JSON.stringify(estado.sensores));

    // Se houver itens na fila da Estação 1, entrega o próximo da fila
    if (filaMensagens[1] && filaMensagens[1].length > 0) {
        const proximaLeitura = filaMensagens[1].shift(); // Pega a primeira da fila
        dadosParaEnviar[1] = {
            ...dadosParaEnviar[1],
            pluviometria: proximaLeitura.pluv,
            nivelRio: proximaLeitura.rio,
            novoDado: true
        };
    } else {
        // Se a fila estiver vazia, garante que vai zerar
        if (dadosParaEnviar[1]) {
            dadosParaEnviar[1].pluviometria = 0;
            dadosParaEnviar[1].nivelRio = 0;
            dadosParaEnviar[1].novoDado = false;
        }
    }

    res.json({
        ...estado,
        sensores: dadosParaEnviar
    });
});

// Rota dedicada e protegida para a aba de previsões
app.get('/api/previsao', verificarAutenticacao, (req, res) => {
    res.json({
        sucesso: true,
        previsoes: estado.previsoes
    });
});

function iniciarMQTT() {
    if (process.env.MQTT_ENABLED !== "true") return;

    const url = `wss://${process.env.MQTT_HOST}:${process.env.MQTT_PORT}/mqtt`;
    
    const opcoes = {
        clientId: 'argos_' + Math.random().toString(16).substring(2, 10),
        username: process.env.MQTT_USERNAME,
        password: process.env.MQTT_PASSWORD,
        reconnectPeriod: 5000,
        rejectUnauthorized: false
    };

    const cliente = mqtt.connect(url, opcoes);

    cliente.on("connect", () => {
        console.log("MQTT Conectado.");
        // Inscreve nos dois tópicos simultaneamente
        cliente.subscribe(process.env.MQTT_TOPIC);
        cliente.subscribe(process.env.MQTT_TOPIC_PREVISAO);
    });

    cliente.on("error", (err) => {
        console.error("Erro MQTT:", err.message);
    });

    cliente.on("message", (topico, mensagem) => {
        try {
            const payloadStr = mensagem.toString().trim();

            // =========================================================
            // 1. DADOS DO SENSOR (Vem da Placa/ESP32)
            // =========================================================
            if (topico === process.env.MQTT_TOPIC) {
                const partes = payloadStr.split(' ');
                
                if (partes.length < 2) return;

                const estacaoMatch = partes[0].match(/estacao=([^,]+)/);
                if (!estacaoMatch || estacaoMatch[1] !== 'sapucai') return;

                const id = 1; 
                const leiturasBrutas = {};
                
                partes[1].split(',').forEach(par => {
                    const [chave, valor] = par.split('=');
                    leiturasBrutas[chave] = parseFloat(valor);
                });

                const pluv = leiturasBrutas['chuva_mm'] !== undefined ? leiturasBrutas['chuva_mm'] : 0;
                const rio = leiturasBrutas['cota'] !== undefined ? leiturasBrutas['cota'] : 0;

                if (!filaMensagens[id]) filaMensagens[id] = [];
                filaMensagens[id].push({ pluv, rio });

                console.log(`[MQTT Sensor] Estação ${id} | Chuva: ${pluv} | Rio: ${rio} (Fila: ${filaMensagens[id].length})`);
            }
            // =========================================================
            // 2. DADOS DA PREVISÃO (Vem da IA via Python/Julia)
            // =========================================================
            else if (topico === process.env.MQTT_TOPIC_PREVISAO) {
                const nivelPrevisto = parseFloat(payloadStr);
                
                // Salva o valor no estado dedicado para a rota /api/previsao
                estado.previsoes[1] = nivelPrevisto;

                console.log(`[MQTT Previsão] Estação 1 | Nível Previsto atualizado: ${nivelPrevisto}`);
            }

        } catch (err) {
            console.error("Erro parser MQTT:", err.message);
        }
    });
}

const porta = process.env.PORTA || 3000;
app.listen(porta, () => {
    console.log(`Servidor rodando na porta ${porta}`);
    iniciarMQTT();
});