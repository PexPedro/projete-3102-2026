function checkAuth() {
    if (!sessionStorage.getItem('argos_auth')) {window.location.href = 'login.html';}
}

const API_URL = "http://localhost:3000/api";

async function buscarEstacoes() {
    try {
        const resposta = await fetch(`${API_URL}/estacoes`);
        if (!resposta.ok) {
            throw new Error(`Erro HTTP: ${resposta.status}`);
        }
        const estacoes = await resposta.json();
        return estacoes;

    } catch (erro) {
        console.error("Erro ao buscar estações:",erro);
        return [];
    }
}

async function buscarDados(endpoint, fallback) {
    try {
        const resposta = await fetch(`${API_URL}${endpoint}`);
        if (!resposta.ok) throw new Error(`Erro HTTP: ${resposta.status}`);
        return await resposta.json();
    } catch (erro) {
        console.error(`Erro ao buscar ${endpoint}:`, erro);
        return fallback;
    }
}

function prepararEstacoes(estacoes) {
    return estacoes.map(estacao => ({
        ...estacao,
        alertas: Number(estacao.alertas) || 0,
        historico: Array.isArray(estacao.historico) ? estacao.historico : []
    }));
}

// NAVEGAÇÃO 
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

    if (tabId !== 'map') {
        document.getElementById('painel-estacao').style.display = 'none';
    }

    if (tabId === 'diagnostico') requestAnimationFrame(iniciarDiagnostico);
}

// MAPA
let mapa;
let estacaoSelecionada = null;

// Marcador de exemplo da primeira estação ARGOS.
// Futuramente, este marcador virá dos dados do broker MQTT.
let ESTACOES = [];

async function iniciarMapa() {

    if (mapa) return;
    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19}).addTo(mapa);

    ESTACOES = prepararEstacoes(await buscarEstacoes());

    ESTACOES.forEach(estacao => {
        const icone = L.divIcon({className:"",iconSize:[25,41],iconAnchor:[12,41],popupAnchor:[1,-34],
            html:`<div class="marker-wrapper">
             <img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png">
             <span id="badge-${estacao.id}" class="station-badge"></span>
             </div>
            `
        });
        estacao.marcador = L.marker([estacao.latitude,estacao.longitude],{icon:icone}).addTo(mapa);
        estacao.marcador.on("click", function(){
            estacaoSelecionada = estacao;
            atualizarBadges();
            atualizarPainel(estacao);
            atualizarGrafico();
        });
        estacao.marcador.bindPopup(`<b>${estacao.nome}</b><br>Alertas ativos: ${estacao.alertas}`);
    });
    atualizarBadges();
}

function atualizarPainel(estacao){
    document.getElementById("painel-estacao").style.display = "block";
    document.getElementById("titulo-estacao").textContent = estacao.nome;
    document.getElementById("status-estacao").textContent = estacao.historico.length > 0 ? "ALERTA" : "Normal";
    document.getElementById("alertas-estacao").textContent = estacao.historico.length;
    document.getElementById("hora-estacao").textContent = estacao.ultimaAtualizacao
        ? new Date(estacao.ultimaAtualizacao).toLocaleTimeString('pt-BR')
        : '--';

    const lista = document.getElementById("lista-alertas");
    lista.innerHTML = "";
    if(estacao.historico.length === 0){
        lista.innerHTML = "<p>Nenhum alerta.</p>";
    } else {
        estacao.historico.slice(0, 5).forEach(alerta=>{
            const card = document.createElement("div");
            card.className = "alerta-card";
            card.innerHTML = `
                <strong>${alerta.horario}</strong><br>
                ${alerta.mensagem}
            `;
            lista.appendChild(card);
        });
    }
}

function atualizarBadges(){

    ESTACOES.forEach(estacao=>{
        const badge = document.getElementById(`badge-${estacao.id}`);
        if(!badge) return;
        if (estacao.alertas > 0) {
            badge.textContent = estacao.alertas;
            badge.style.display = "flex";
        } else {
            badge.style.display = "none";
        }
        if (estacao.marcador && estacao.marcador.getPopup()) {
            estacao.marcador.setPopupContent(`<b>${estacao.nome}</b><br>Alertas ativos: ${estacao.alertas}`);
        }
    });
}

let contadorAlertas = 0;

function obterTipoAlerta(sensor){
    switch(sensor){
        case "Pluviômetro":
            return "Chuva Forte";
        case "Anemômetro":
            return "Ventania";
        case " de Umidade":
            return "Alta Umidade";
        case " de Umidade + Anemômetro":
            return "Tempestade";
        default:
            return "Alerta";
    }
}

function obterNivelAlerta(sensor){
    switch(sensor){
        case "Pluviômetro":
            return "Crítico";
        case "Anemômetro":
            return "Alto";
        case " de Umidade":
            return "Moderado";
        default:
            return "Crítico";
    }
}

function obterValorAlerta(mensagem) {
    const numero = mensagem.match(/[-+]?[0-9]*\.?[0-9]+/);
    return numero ? numero[0] : null;
}

function obterLimiteAlerta(mensagem) {
    const limiar = mensagem.match(/limiar:\s*([0-9]+\.?[0-9]*)/i);
    return limiar ? limiar[1] : null;
}

// ESTA FUNÇÃO PERMANECE COM MQTT, mas o chamador muda.
function registrarAlerta(dados) {
    const agora      = new Date();
    const data       = agora.toLocaleDateString('pt-BR');
    const hora       = agora.toLocaleTimeString('pt-BR');
    const timestamp  = `${data} — ${hora}`;

    const estacao = ESTACOES.find(e => e.id === Number(dados.estacaoId) || e.nome === dados.estacao);
    if(!estacao) return;

    estacao.alertas++;
    estacao.historico.unshift({
        sensor: dados.sensor,
        tipo: obterTipoAlerta(dados.sensor),
        nivel: obterNivelAlerta(dados.sensor),
        valor: obterValorAlerta(dados.mensagem),
        limite: obterLimiteAlerta(dados.mensagem),
        mensagem: `Sensor ${dados.sensor}: ${dados.mensagem}`,
        horario: timestamp
    });

    contadorAlertas++;
    const badge = document.getElementById("badge-alertas");
    if (badge) {badge.textContent = contadorAlertas; badge.style.display = "flex";}
    atualizarBadges();

    if(estacaoSelecionada && estacaoSelecionada.id === estacao.id){
        atualizarPainel(estacao);
    }
}

async function atualizarAlertas() {
    const alertas = await buscarDados('/alertas', {});
    contadorAlertas = 0;
    ESTACOES.forEach(estacao => {
        const historico = alertas[estacao.id] ?? [];
        estacao.historico = historico;
        estacao.alertas = historico.length;
        contadorAlertas += historico.length;
    });
    const badge = document.getElementById('badge-alertas');
    if (badge) {
        badge.textContent = contadorAlertas;
        badge.style.display = contadorAlertas ? 'flex' : 'none';
    }
    atualizarBadges();
    if (estacaoSelecionada) atualizarPainel(estacaoSelecionada);
}

function iniciarLeituraAPI() {
    atualizarAlertas();
    setInterval(atualizarAlertas, 5000);
}

// ANÁLISE GRÁFICA
let sensorChart;
let graficoTempoInicio = null;
let graficoEstacaoId = null;

const SERIES_CONFIG = [
    {
        label: "Temperatura",
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
        base: 22,
        min: 18,
        max: 35,
        step: 2,
        initial: [20,22,24,27,26,22]
    },
    {
        label: "Umidade",
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.15)',
        base: 78,
        min: 60,
        max: 92,
        step: 4,
        initial: [88,83,76,71,69,80]
    },
    {
        label: "Pluviometria",
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245,158,11,0.15)',
        base: 4,
        min: 0,
        max: 20,
        step: 3,
        initial: [3,5,2,0,0,6]
    },
    {
        label: "Velocidade do vento",
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.15)',
        base: 12,
        min: 0,
        max: 40,
        step: 4,
        initial: [5,12,18,16,10,7]
    },
    {
        label: "Nível do rio",
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139,92,246,0.15)',
        base: 1.24,
        min: 0.8,
        max: 1.5,
        step: 0.04,
        initial: [1.20,1.22,1.25,1.26,1.24,1.21]
    }
];

const SENSOR_FIELDS = [
    'temperatura', 'umidade', 'pluviometria', 'velocidadeVento', 'nivelRio'
];

function gerarValorProximo(config, anterior) {
    if (anterior == null) return config.base;
    const delta = (Math.random() * config.step * 2) - config.step;
    const valor = Number((anterior + delta).toFixed(2));
    return Math.min(config.max, Math.max(config.min, valor));
}

function iniciarGrafico(){
    const canvas = document.getElementById("sensorChart");
    if(!canvas || sensorChart) return;
    graficoTempoInicio = Date.now();
    Chart.register(ChartZoom);

    sensorChart = new Chart(canvas,{type:"line",data:{datasets: SERIES_CONFIG.map(config => ({
            label: config.label,
            borderColor: config.borderColor,
            backgroundColor: config.backgroundColor,
            fill: false,
            tension: 0.3,
            pointRadius: 4,
            data: []
        }))
    },options:{
            responsive:true,
            maintainAspectRatio:false,
            layout: { padding: { top: 10, right: 12, bottom: 28, left: 12 } },
            interaction: { mode: 'nearest', axis: 'x', intersect: false },
            scales: {
                x: {
                    type: 'linear',
                    min: 0,
                    title: { display: true, text: 'Tempo (s)' },
                    ticks: { callback: value => `${value}s`, autoSkip: true, maxTicksLimit: 12 },
                    grid: { drawBorder: false }
                },
                y: {
                    beginAtZero: true,
                    title: { display: true, text: 'Valor' },
                    grid: { drawBorder: false }
                }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: {
                    callbacks: {
                        title: items => items.length ? `Tempo: ${items[0].parsed.x}s` : '',
                        label: item => `${item.dataset.label}: ${item.parsed.y}`
                    }
                },
                zoom: {
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x'
                    },
                    pan: {
                        enabled: true,
                        mode: 'x'
                    },
                    limits: {
                        x: { min: 0 }
                    }
                }
            }
        }});
}

async function atualizarGrafico() {
    if (!sensorChart || !ESTACOES.length) return;
    const estacao = estacaoSelecionada ?? ESTACOES[0];
    if (graficoEstacaoId !== estacao.id) {
        sensorChart.data.datasets.forEach(dataset => { dataset.data = []; });
        graficoEstacaoId = estacao.id;
    }
    const dados = await buscarDados(`/sensores/${estacao.id}`, {});
    const tempo = Math.floor((Date.now() - graficoTempoInicio) / 1000);

    SENSOR_FIELDS.forEach((campo, index) => {
        const valor = Number(dados[campo]);
        if (!Number.isFinite(valor)) return;
        sensorChart.data.datasets[index].data.push({ x: tempo, y: valor });
    });
    sensorChart.update();
}

function toggleDataset(indice){
    const dataset = sensorChart.getDatasetMeta(indice);
    dataset.hidden = !dataset.hidden;
    sensorChart.update();
}

function resetChartZoom(){
    if(!sensorChart) return;
    sensorChart.resetZoom();
}

setInterval(atualizarGrafico, 5000);

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
 
let REDE_ESTACOES = [];
let REDE_CONEXOES = [];
 
const CORES_REDE = {
    estavel:     '#22c55e',
    instavel:    '#f59e0b',
    sem_conexao: '#ef4444'
};
 
function qualidadeEstacao(id) {
    const cx = REDE_CONEXOES.filter(c => c.de === id || c.para === id);
    if (cx.some(c => c.qualidade === 'estavel'))  return 'estavel';
    if (cx.some(c => c.qualidade === 'instavel')) return 'instavel';
    return 'sem_conexao';
}

function obterDadosEstacao(id) {
    return ESTACOES.find(est => est.id === Number(id) || est.nome === id) || { latitude: '-', longitude: '-' };
}

function renderizarDiagnostico() {
    const container = document.getElementById('rede-cards');
    if (!container) return;

    container.innerHTML = '';
    REDE_ESTACOES.forEach(estacao => {
        const qualidade = qualidadeEstacao(estacao.id);
        const dados = obterDadosEstacao(estacao.id);
        const card = document.createElement('div');
        card.className = 'rede-card';
        card.innerHTML = `
            <div class="rede-card-header">
                <div class="rede-card-icon">
                    <svg viewBox="0 0 24 24"><path d="M4 5a2 2 0 0 1 2-2h2v2H6v14h12V5h-2V3h2a2 2 0 0 1 2 2v6h-2V7H6v12h12v-4h2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5Zm4 6h8v2H8v-2Zm0-4h8v2H8V7Zm0 8h5v2H8v-2Z"/></svg>
                </div>
                <div class="rede-card-title">${estacao.id}</div>
                <span class="status-badge status-${qualidade}">${qualidade.replace('_',' ')}</span>
            </div>
            <div class="rede-card-body">
                <div class="rede-card-row"><strong>Qualidade da Comunicação:</strong><span>${qualidade === 'estavel' ? 'Estável' : qualidade === 'instavel' ? 'Instável' : 'Sem conexão'}</span></div>
                <div class="rede-card-row"><strong>Latitude:</strong><span>${dados.latitude}</span></div>
                <div class="rede-card-row"><strong>Longitude:</strong><span>${dados.longitude}</span></div>
                <div class="rede-card-row"><strong>Atualizado:</strong><span>${new Date().toLocaleDateString('pt-BR')}</span></div>
            </div>
        `;
        container.appendChild(card);
    });
}
 
let diagnosticoIniciado = false;
 
function iniciarDiagnostico() {
    if (diagnosticoIniciado) return;
    diagnosticoIniciado = true;
 
    window.addEventListener('resize', renderizarDiagnostico);
    atualizarDiagnostico();
}

async function atualizarDiagnostico() {
    const conexoes = await buscarDados('/rede', []);
    REDE_CONEXOES = conexoes.map(conexao => ({
        ...conexao,
        de: Number(conexao.de),
        para: Number(conexao.para),
        qualidade: conexao.qualidade === 'desconhecida' ? 'sem_conexao' : conexao.qualidade
    }));
    REDE_ESTACOES = ESTACOES.map(estacao => ({ id: estacao.id }));
    renderizarDiagnostico();
}

setInterval(atualizarDiagnostico, 5000);

// RELATÓRIOS
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

// INTEGRAÇÃO GERAL 
window.addEventListener("load", async () => {
    if(!document.getElementById("map-page")) return;
    checkAuth();
    await iniciarMapa();
    iniciarGrafico();
    atualizarGrafico();
    iniciarDiagnostico();
    iniciarLeituraAPI();
});
