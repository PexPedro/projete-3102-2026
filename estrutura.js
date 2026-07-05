const USUARIO_VALIDO = "Equipe";

// Para uma nova senha (F12):
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('SUA_SENHA'))
//     .then(h => console.log(
//       Array.from(new Uint8Array(h))
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('')
//     ));

const HASH_SENHA = "9ec5adcb162fea7bdcefce818598776ef77423ee0f29bcbe8d5f564b7bd47703"; // SHA-256 da senha "3102".

async function hashTexto(texto) {

    const encoder   = new TextEncoder();        // Converte string - bytes (Uint8Array).
    const data      = encoder.encode(texto);     // Bytes da senha digitada.
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function login() {

    const user = document.getElementById("username").value; 
    const pass = document.getElementById("password").value; 
    const hashDigitado = await hashTexto(pass); // Calcula o hash da senha digitada.

    if (user === USUARIO_VALIDO && hashDigitado === HASH_SENHA) {

        document.getElementById("login-page").style.display = "none";
        document.getElementById("map-page").style.display   = "flex"; 

        iniciarMapa();

        // Quando o broker MQTT estiver ativo, substituir a linha de baixo por: cliente.connect() / cliente.subscribe()
        // (ver bloco "SIMULAÇÃO DE ALERTAS" no final)
        iniciarSimulacaoAlertas();

        setTimeout(() => { mapa.invalidateSize(); }, 100);

    } else {
        alert("Usuário ou senha incorretos.");
    }
}

function openTab(tabId, event) {

    const contents = document.querySelectorAll(".content");
    contents.forEach(content => {content.classList.remove("active-content");});

    document.getElementById(tabId).classList.add("active-content");

    const tabs = document.querySelectorAll(".tab");
    tabs.forEach(tab => {tab.classList.remove("active");});

    event.target.classList.add("active");

    // PONTO DE INTEGRAÇÃO — Badge de Alertas
    // Ao abrir a aba "Alertas", o badge de notificação é zerado:
    // o usuário sinalizou que viu as mensagens pendentes.
    if (tabId === 'alertas') {
        contadorAlertas = 0;
        const badge = document.getElementById("badge-alertas");
        if (badge) badge.style.display = "none";
    }
}

function abrirRelatorio() {
    document.getElementById("report-modal").style.display = "flex";
}

function fecharRelatorio() {
    document.getElementById("report-modal").style.display = "none";
}

function limparFormulario() {
    document.getElementById("nome").value          = "";
    document.getElementById("instituicao").value   = "";
    document.getElementById("situacao").value      = "";
    document.getElementById("documentacao").value  = "";
}

function salvarRelatorio() {

    const nome          = document.getElementById("nome").value;
    const instituicao   = document.getElementById("instituicao").value;
    const situacao      = document.getElementById("situacao").value;
    const documentacao  = document.getElementById("documentacao").value;

    const lista = document.getElementById("lista-relatorios");

    const card = document.createElement("div");
    card.className = "report-card";

    const quantidade = document.querySelectorAll(".report-card").length + 1;

    card.innerHTML = `
        <div class="report-title">
            Relatório ${quantidade}
        </div>

        <div class="report-subtitle">
            ${situacao}
        </div>

        <div class="report-date">
            ${new Date().toLocaleDateString('pt-BR')}
        </div>

        <div class="report-details">
            <p><strong>Nome:</strong> ${nome}</p>
            <p><strong>Instituição:</strong> ${instituicao}</p>
            <p><strong>Documentação:</strong></p>
            <p class="doc-texto">${documentacao}</p>
        </div>
    `;

    const detalhes = card.querySelector(".report-details");
    detalhes.style.display = "none";
    card.onclick = function () {
        detalhes.style.display =
            detalhes.style.display === "none" ? "block" : "none";
    };

    lista.appendChild(card);
    limparFormulario();
    fecharRelatorio();
}


let mapa;

function iniciarMapa() {

    if (mapa) return;
    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19}).addTo(mapa);

    // Marcador de exemplo da primeira estação ARGOS.
    // Futuramente, este marcador virá dos dados do broker MQTT.
    L.marker([-22.2473, -45.731]).addTo(mapa).bindPopup("Estação ARGOS-001");
}

/* ============================================================
   SIMULAÇÃO DE ALERTAS
   ESTE BLOCO INTEIRO DEVE SER SUBSTITUÍDO PELO MQTT!
   ============================================================
 
   Quando a rede LoRa + broker MQTT estiver disponível:
 
   1. Remova as constantes ESTACOES_SIMULADAS e POOL_ALERTAS.
   2. Remova a função gerarAlertaSimulado().
   3. Remova o setInterval dentro de iniciarSimulacaoAlertas().
   4. Substitua pelo código de conexão MQTT, por exemplo:
 
      import mqtt from 'https://unpkg.com/mqtt/dist/mqtt.min.js';
 
      function iniciarSimulacaoAlertas() {
          const cliente = mqtt.connect('ws://SEU_BROKER_IP:9001');
          cliente.subscribe('argos/alertas/#');
          cliente.on('message', (topico, payload) => {
              const dado = JSON.parse(payload.toString());
              // dado deve conter: { estacao, sensor, mensagem }
              registrarAlerta(dado); // ← esta função NÃO muda
          });
      }
 
   registrarAlerta() NÃO precisa ser alterada, ela apenas
   renderiza o card, independente da fonte.
   ============================================================ */
 
let contadorAlertas = 0; // (Controla o badge) 
let simulacaoIniciada = false; // Evita múltiplas simulações rodando ao mesmo tempo 
 
// AJUSTAR VALORES para a calibração real dos sensores.
// Referência: Manual de Avisos Meteorológicos — INMET (2021) e Escala de Beaufort — WMO No. 8 (2018)
const LIMIAR_UMIDADE_PERCENT  = 85;  
const LIMIAR_VENTO_KMH        = 50;  
const LIMIAR_CHUVA_MM_H       = 25;  
 
 
// SUBSTITUIR pelo cadastro de estações do MQTT.
const ESTACOES_SIMULADAS = ["Estação 001", "Estação 002", "Estação 003",];

// Cada item é uma função que recebe o nome da estação e retorna
// SUBSTITUIR pelos dados reais do MQTT.
const POOL_ALERTAS = [
 
    (est) => ({
        estacao: est,
        sensor:  " de Umidade",
        mensagem: `Umidade relativa acima do limiar: ` +
                  `${(Math.random() * 14 + LIMIAR_UMIDADE_PERCENT).toFixed(1)}% ` +
                  `(limiar: ${LIMIAR_UMIDADE_PERCENT}%) — risco de chuva intensa`
    }),
 
    (est) => ({
        estacao: est,
        sensor:  "Anemômetro",
        mensagem: `Velocidade do vento acima do limiar: ` +
                  `${(Math.random() * 50 + LIMIAR_VENTO_KMH).toFixed(1)} km/h ` +
                  `(limiar: ${LIMIAR_VENTO_KMH} km/h) — ventania registrada`
    }),
 
    (est) => ({
        estacao: est,
        sensor:  "Pluviômetro",
        mensagem: `Precipitação acumulada acima do limiar: ` +
                  `${(Math.random() * 55 + LIMIAR_CHUVA_MM_H).toFixed(1)} mm/h ` +
                  `(limiar: ${LIMIAR_CHUVA_MM_H} mm/h) — chuva forte detectada`
    }),
 
    (est) => ({
        estacao: est,
        sensor:  " de Umidade + Anemômetro",
        mensagem: `Condição combinada crítica: umidade ` +
                  `${(Math.random() * 10 + 88).toFixed(1)}% e ` +
                  `ventos ${(Math.random() * 30 + 55).toFixed(1)} km/h ` +
                  `— alta probabilidade de tempestade`
    })
];
 
 
// REMOVER quando MQTT estiver ativo.
function gerarAlertaSimulado() {
    const estacao  = ESTACOES_SIMULADAS[Math.floor(Math.random() * ESTACOES_SIMULADAS.length)];
    const gerador  = POOL_ALERTAS[Math.floor(Math.random() * POOL_ALERTAS.length)];
    return gerador(estacao);
}
 
// ESTA FUNÇÃO PERMANECE COM MQTT, mas o chamador muda.
function registrarAlerta(dados) {
 
    const idColuna = "col-" + dados.estacao.replace(/\s+/g, '-').toLowerCase();
    let coluna = document.getElementById(idColuna);
 
    if (!coluna) {
        coluna = document.createElement("div");
        coluna.className = "coluna-estacao";
        coluna.id = idColuna;
 
        const titulo = document.createElement("div");
        titulo.className = "coluna-titulo";
        titulo.textContent = dados.estacao;
        coluna.appendChild(titulo);
 
        const lista = document.getElementById("lista-alertas").appendChild(coluna);
    }

    const card  = document.createElement("div");
    card.className = "alerta-card";
 
    const agora      = new Date();
    const data       = agora.toLocaleDateString('pt-BR');
    const hora       = agora.toLocaleTimeString('pt-BR');
    const timestamp  = `${data} — ${hora}`;
 
    card.innerHTML = `
        <div class="alerta-estacao">${dados.estacao}</div>
        <div class="alerta-mensagem">
            Sensor ${dados.sensor}: ${dados.mensagem}
        </div>
        <div class="alerta-timestamp">${timestamp}</div>
    `;
 
    const primeiroCard = coluna.querySelector(".alerta-card");
    if (primeiroCard) {
        coluna.insertBefore(card, primeiroCard);
    } else {
        coluna.appendChild(card);
    }
 
    // Atualiza o badge, ocultado automaticamente quando o usuário abre a aba.
    contadorAlertas++;
    const badge = document.getElementById("badge-alertas");
    if (badge) {
        badge.textContent    = contadorAlertas;
        badge.style.display  = "flex";
    }
}
 
// SUBSTITUIR o corpo desta função pela conexão MQTT real.
function iniciarSimulacaoAlertas() {
 
    // Não inicia duas simulações se login() for chamado mais de uma vez
    if (simulacaoIniciada) return;
    simulacaoIniciada = true;
 
    // REMOVER quando o MQTT estiver ativo.
    setInterval(() => {registrarAlerta(gerarAlertaSimulado());}, 5000);
}
