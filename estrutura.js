// ===== AUTENTICAÇÃO =====
const USUARIO_VALIDO = "Equipe";
const HASH_SENHA = "9ec5adcb162fea7bdcefce818598776ef77423ee0f29bcbe8d5f564b7bd47703"; // SHA-256 da senha "3102".

// Para nova senha (F12):
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('SUA_SENHA'))
//     .then(h => console.log(
//       Array.from(new Uint8Array(h))
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('')
//     ));

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

// ===== NAVEGAÇÃO =====
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

    if (tabId === 'diagnostico') requestAnimationFrame(iniciarDiagnostico);
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

// MAPA
let mapa;

function iniciarMapa() {

    if (mapa) return;
    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19}).addTo(mapa);

    // Marcador de exemplo da primeira estação ARGOS.
    // Futuramente, este marcador virá dos dados do broker MQTT.
    L.marker([-22.2473, -45.731]).addTo(mapa).bindPopup("Estação ARGOS-001");
    L.marker([-22.3961, -45.737]).addTo(mapa).bindPopup("Estação ARGOS-002");
    L.marker([-22.2500, -45.619]).addTo(mapa).bindPopup("Estação ARGOS-003");
    L.marker([-22.2627, -45.805]).addTo(mapa).bindPopup("Estação ARGOS-004");
}

/* SIMULAÇÃO DE ALERTAS
   ESTE BLOCO INTEIRO DEVE SER SUBSTITUÍDO PELO MQTT!

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
const ESTACOES_SIMULADAS = ["Estação 001", "Estação 002", "Estação 003", "Estação 004"];

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

// DIAGNÓSTICO DE REDE

/* SUBSTITUIR: REDE_ESTACOES e REDE_CONEXOES virão do MQTT.
 * renderizarDiagnostico() e desenharEstacaoSVG() não precisam ser alteradas.
 *
 * Exemplo com MQTT:
 *   cliente.on('message', (topico, payload) => {
 *       const { de, para, qualidade } = JSON.parse(payload.toString());
 *       const con = REDE_CONEXOES.find(c => c.de === de && c.para === para);
 *       if (con) con.qualidade = qualidade; else REDE_CONEXOES.push({ de, para, qualidade });
 *       renderizarDiagnostico();
 *   });
 */
 
let REDE_ESTACOES = [
    { id: 'Estação 001' },
    { id: 'Estação 002' },
    { id: 'Estação 003' },
    { id: 'Estação 004' },
];
 
let REDE_CONEXOES = [
    { de: 'Estação 001', para: 'Estação 002', qualidade: 'estavel' },
    { de: 'Estação 001', para: 'Estação 003', qualidade: 'estavel' },
    { de: 'Estação 002', para: 'Estação 003', qualidade: 'estavel' },
    { de: 'Estação 001', para: 'Estação 004', qualidade: 'instavel' },
    { de: 'Estação 002', para: 'Estação 004', qualidade: 'sem_conexao' },
    { de: 'Estação 003', para: 'Estação 004', qualidade: 'sem_conexao' }
];
 
const CORES_REDE = {
    estavel:     '#22c55e',
    instavel:    '#f59e0b',
    sem_conexao: '#ef4444'
};
 
function svgEl(tag, attrs) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    return e;
}
 
function qualidadeEstacao(id) {
    const cx = REDE_CONEXOES.filter(c => c.de === id || c.para === id);
    if (cx.some(c => c.qualidade === 'estavel'))  return 'estavel';
    if (cx.some(c => c.qualidade === 'instavel')) return 'instavel';
    return 'sem_conexao';
}
 
function calcularPosicoes(W, H) {
    const cx = W / 2, cy = H / 2;
    const rx = Math.min(W * 0.35, 220);
    const ry = Math.min(H * 0.38, 170);
    const n  = REDE_ESTACOES.length;
 
    return REDE_ESTACOES.map((est, i) => ({
        ...est,
        x: cx + rx * Math.cos((2 * Math.PI * i / n) - Math.PI / 2),
        y: cy + ry * Math.sin((2 * Math.PI * i / n) - Math.PI / 2)
    }));
}
 
function desenharEstacaoSVG(svg, x, y, id, qualidade) {
    const cor = CORES_REDE[qualidade] || '#9ca3af';
    const g   = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const ic  = '#374151';
 
    function lin(x1, y1, x2, y2) {
        g.appendChild(svgEl('line', { x1, y1, x2, y2, stroke: ic, 'stroke-width': 1.8, 'stroke-linecap': 'round' }));
    }
 
    g.appendChild(svgEl('rect', {
        x: x-28, y: y-28, width: 56, height: 50, rx: 6,
        fill: '#f9fafb', stroke: cor, 'stroke-width': 2.5
    }));
 
    lin(x, y-26, x, y-21);
    lin(x-14, y-21, x+14, y-21);
    lin(x-14, y-21, x-14, y-25);  lin(x-14, y-25, x-10, y-25);
    lin(x+14, y-21, x+14, y-25);  lin(x+10, y-25, x+14, y-25);
    lin(x, y-21, x, y+2);

    g.appendChild(svgEl('rect', {
        x: x-6, y: y-11, width: 12, height: 10, rx: 1,
        stroke: ic, 'stroke-width': 1.8, fill: '#e5e7eb'
    }));
 
    [-18, -11, -4].forEach(dy => {
        lin(x-22, y+dy,   x-14, y+dy);
        lin(x-18, y+dy-3, x-18, y+dy+3);
    });
 
    g.appendChild(svgEl('rect', {
        x: x+11, y: y-17, width: 9, height: 8, rx: 1,
        stroke: ic, 'stroke-width': 1.8, fill: 'none'
    }));
 
    lin(x, y+2, x-14, y+19);
    lin(x, y+2, x+14, y+19);
    lin(x, y+2, x,    y+19);
 
    const lbl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    lbl.setAttribute('x',           x);
    lbl.setAttribute('y',           y + 34);
    lbl.setAttribute('text-anchor', 'middle');
    lbl.setAttribute('font-size',   '11');
    lbl.setAttribute('font-weight', 'bold');
    lbl.setAttribute('fill',        'white');
    lbl.textContent = id;
    g.appendChild(lbl);
 
    svg.appendChild(g);
}
 
function renderizarDiagnostico() {
    const svg = document.getElementById("rede-svg");
    if (!svg || !svg.parentElement) return;
 
    const W = svg.parentElement.clientWidth  || 800;
    const H = svg.parentElement.clientHeight || 500;
 
    svg.setAttribute('width',   W);
    svg.setAttribute('height',  H);
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.innerHTML = '';
 
    const pos = calcularPosicoes(W, H);
    const map = Object.fromEntries(pos.map(p => [p.id, p]));
 
    // Desenha 5 dots ao longo de cada caminho de conexão
    REDE_CONEXOES.forEach(({ de, para, qualidade }) => {
        const A = map[de], B = map[para];
        if (!A || !B) return;
        const cor = CORES_REDE[qualidade] || CORES_REDE.sem_conexao;
 
        for (let i = 1; i <= 5; i++) {
            const t = i / 6;
            svg.appendChild(svgEl('circle', {
                cx:   A.x + (B.x - A.x) * t,
                cy:   A.y + (B.y - A.y) * t,
                r:    6,
                fill: cor
            }));
        }
    });
 
    pos.forEach(({ id, x, y }) => desenharEstacaoSVG(svg, x, y, id, qualidadeEstacao(id)));
}
 
function simularVariacaoRede(qualidade) {
    const tabela = {
        estavel:     ['estavel', 'estavel', 'estavel', 'instavel'],
        instavel:    ['instavel', 'instavel', 'estavel', 'sem_conexao'],
        sem_conexao: ['sem_conexao', 'sem_conexao', 'instavel'],
    };
    const opcoes = tabela[qualidade] || tabela.sem_conexao;
    return opcoes[Math.floor(Math.random() * opcoes.length)];
}
 
let diagnosticoIniciado = false;
 
function iniciarDiagnostico() {
    if (diagnosticoIniciado) return;
    diagnosticoIniciado = true;
 
    renderizarDiagnostico();
    window.addEventListener('resize', renderizarDiagnostico);
 
    let ciclo = 0;
 
    //SUBSTITUIR: intervalo e dados simulados serão removidos quando MQTT fornecer conectividade real
    setInterval(() => {
        ciclo++;
        
        REDE_CONEXOES.forEach(con => {
            if (Math.random() < 0.25) con.qualidade = simularVariacaoRede(con.qualidade);
        });
 
        renderizarDiagnostico();
    }, 4000);
}
