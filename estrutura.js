function checkAuth() {
    if (!sessionStorage.getItem('argos_auth')) {window.location.href = 'login.html';}
}

    /*document.addEventListener('DOMContentLoaded', () => {

        if (!document.getElementById('mapa-regiao')) return;
        checkAuth();
        iniciarMapa();
        //Substituir por cliente.connect() / cliente.subscribe()
        setTimeout(() => { if (mapa) mapa.invalidateSize(); }, 100);
    });*/

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
const ESTACOES = [

    {
        id: 1,
        nome: "Estação 001",
        latitude: -22.2473,
        longitude: -45.731,
        alertas: 0,
        historico: [],
        marcador: null
    },

    {
        id: 2,
        nome: "Estação 002",
        latitude: -22.3961,
        longitude: -45.737,
        alertas: 0,
        historico: [],
        marcador: null
    },

    {
        id: 3,
        nome: "Estação 003",
        latitude: -22.2500,
        longitude: -45.619,
        alertas: 0,
        historico: [],
        marcador: null
    },

    {
        id: 4,
        nome: "Estação 004",
        latitude: -22.2627,
        longitude: -45.805,
        alertas: 0,
        historico: [],
        marcador: null
    }
];

function iniciarMapa() {

    if (mapa) return;
    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19}).addTo(mapa);

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
            estacao.alertas = 0;
            atualizarBadges();
            atualizarPainel(estacao);
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
    document.getElementById("hora-estacao").textContent = new Date().toLocaleTimeString();

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

/* SIMULAÇÃO DE ALERTAS
   DEVE SER SUBSTITUÍDO PELO MQTT:
   1. Remover ESTACOES_SIMULADAS e POOL_ALERTAS.
   2. Remover gerarAlertaSimulado().
   3. Remover setInterval() dentro de iniciarSimulacaoAlertas().
   4. Substituir pelo código de conexão MQTT,ex:

      import mqtt from 'https://unpkg.com/mqtt/dist/mqtt.min.js';
      function Alertas() {
          const cliente = mqtt.connect('ws://SEU_BROKER_IP:9001');
          cliente.subscribe('argos/alertas/#');
          cliente.on('message', (topico, payload) => {
              const dado = JSON.parse(payload.toString());
              // dado deve conter: { estacao, sensor, mensagem }
              registrarAlerta(dado); -> NÃO precisa ser alterada.
          });
      }
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

    const estacao = ESTACOES.find(e => e.nome === dados.estacao);
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
 
// SUBSTITUIR pela conexão MQTT.
function iniciarSimulacaoAlertas() {
     if (simulacaoIniciada) return;
    simulacaoIniciada = true;
    setInterval(() => {registrarAlerta(gerarAlertaSimulado());}, 5000); // REMOVER pelo MQTT.
}

// ANÁLISE GRÁFICA
let sensorChart;
let graficoTempoInicio = null;

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
            data: config.initial.map((value, index) => ({ x: index * 5, y: value }))
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

function toggleDataset(indice){
    const dataset = sensorChart.getDatasetMeta(indice);
    dataset.hidden = !dataset.hidden;
    sensorChart.update();
}

function resetChartZoom(){
    if(!sensorChart) return;
    sensorChart.resetZoom();
}

setInterval(()=>{
    if(!sensorChart) return;
    const ultimoX = SERIES_CONFIG[0].initial.length > 0
        ? (SERIES_CONFIG[0].initial.length - 1) * 5: 0;
    const tempo = ultimoX + Math.ceil((Date.now() - graficoTempoInicio) / 1000);

    sensorChart.data.datasets.forEach((dataset, index)=>{
        const ultimo = dataset.data.length ? dataset.data[dataset.data.length - 1].y : null;
        dataset.data.push({ x: tempo, y: gerarValorProximo(SERIES_CONFIG[index], ultimo) });
    });
    sensorChart.update();
},5000);

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
 
function qualidadeEstacao(id) {
    const cx = REDE_CONEXOES.filter(c => c.de === id || c.para === id);
    if (cx.some(c => c.qualidade === 'estavel'))  return 'estavel';
    if (cx.some(c => c.qualidade === 'instavel')) return 'instavel';
    return 'sem_conexao';
}

function obterDadosEstacao(id) {
    return ESTACOES.find(est => est.nome === id) || { latitude: '-', longitude: '-' };
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
window.addEventListener("load", () => {
    if(!document.getElementById("map-page")) return;
    checkAuth();
    iniciarMapa();
    iniciarGrafico();
    iniciarDiagnostico();
    iniciarSimulacaoAlertas();
});
