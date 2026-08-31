let mapa;
let marcadores = {};
let estacoes = {};
let sensoresAtuais = {};
let alertasAtuais = {};
let estacaoSelecionada = null;

export function iniciarMapa(listaEstacoes, sensores = {}, alertas = {}) {
    if (mapa) return;
    estacoes = Object.fromEntries(listaEstacoes.map(estacao => [estacao.id, estacao]));
    sensoresAtuais = sensores;
    alertasAtuais = alertas;

    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapa);

    listaEstacoes.forEach(est => {
        const icone = L.divIcon({
            className: "", iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34],
            html: `<div class="marker-wrapper"><img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png"><span id="badge-${est.id}" class="station-badge" style="display: none;"></span></div>`
        });
        
        marcadores[est.id] = L.marker([est.latitude, est.longitude], { icon: icone }).addTo(mapa);
        marcadores[est.id].on('click', () => abrirPainel(est.id));
    });

    document.getElementById('fechar-painel-estacao')?.addEventListener('click', fecharPainel);
    mapa.on('move zoom', posicionarPainel);
    atualizarPainel();
}

export function atualizarMapa(alertas, sensores = {}) {
    if (!alertas) return;
    alertasAtuais = alertas;
    sensoresAtuais = sensores;

    Object.keys(alertas).forEach(id => {
        const qtd = alertas[id].length;
        const badge = document.getElementById(`badge-${id}`);
        if (badge) {
            badge.textContent = qtd;
            badge.style.display = qtd > 0 ? "flex" : "none";
        }
    });

    atualizarPainel();
    posicionarPainel();
}

function abrirPainel(id) {
    estacaoSelecionada = id;
    atualizarPainel();
    document.getElementById('painel-estacao').style.display = 'block';
    posicionarPainel();
}

function fecharPainel() {
    estacaoSelecionada = null;
    document.getElementById('painel-estacao').style.display = 'none';
}

function valorLeitura(valor, unidade = '') {
    return valor === undefined || valor === null || valor === '' ? '--' : `${valor}${unidade}`;
}

function textoAlerta(alerta) {
    if (typeof alerta === 'string') return alerta;
    if (!alerta || typeof alerta !== 'object') return 'Valor fora do limite esperado.';

    const mensagem = alerta.mensagem || alerta.message || alerta.descricao || alerta.motivo;
    if (mensagem) return mensagem;

    const tipo = alerta.tipo || alerta.sensor || alerta.variavel || 'Leitura';
    const valor = alerta.valor !== undefined ? ` (${alerta.valor})` : '';
    return `${tipo}: valor fora do limite esperado${valor}.`;
}

function atualizarPainel() {
    if (!estacaoSelecionada) return;

    const estacao = estacoes[estacaoSelecionada];
    const leituras = sensoresAtuais[estacaoSelecionada] || {};
    const alertas = alertasAtuais[estacaoSelecionada] || [];
    if (!estacao) return;

    document.getElementById('titulo-estacao').textContent = estacao.nome;
    document.getElementById('temperatura-estacao').textContent = valorLeitura(leituras.temperatura, ' °C');
    document.getElementById('umidade-estacao').textContent = valorLeitura(leituras.umidade, ' %');
    document.getElementById('pluviometria-estacao').textContent = valorLeitura(leituras.pluviometria, ' mm');
    document.getElementById('nivel-rio-estacao').textContent = valorLeitura(leituras.nivelRio, ' m');
    document.getElementById('alertas-estacao').textContent = alertas.length;

    const listaAlertas = document.getElementById('lista-alertas');
    listaAlertas.replaceChildren();
    if (alertas.length === 0) {
        listaAlertas.textContent = 'Nenhum alerta no momento.';
        return;
    }

    alertas.forEach(alerta => {
        const item = document.createElement('div');
        item.className = 'alerta-item';
        item.textContent = textoAlerta(alerta);
        listaAlertas.appendChild(item);
    });
}

function posicionarPainel() {
    if (!estacaoSelecionada || !mapa) return;

    const painel = document.getElementById('painel-estacao');
    if (painel.style.display === 'none') return;

    const ponto = mapa.latLngToContainerPoint(marcadores[estacaoSelecionada].getLatLng());
    const largura = painel.offsetWidth;
    const altura = painel.offsetHeight;
    const tamanhoMapa = mapa.getSize();
    const margem = 12;
    const espacoLateral = 18;
    const esquerda = ponto.x + largura + espacoLateral <= tamanhoMapa.x
        ? ponto.x + espacoLateral
        : ponto.x - largura - espacoLateral;
    const topo = Math.max(margem, Math.min(ponto.y - altura / 2, tamanhoMapa.y - altura - margem));

    painel.style.left = `${Math.max(margem, esquerda)}px`;
    painel.style.top = `${topo}px`;
}