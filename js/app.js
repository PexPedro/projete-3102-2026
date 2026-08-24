import { checkAuth, buscarDados } from './api.js';
import { iniciarUI } from './ui.js';
import { iniciarMapa, atualizarMapa } from './mapa.js';
import { iniciarGrafico, atualizarGraficos } from './graficos.js';
import { atualizarDiagnostico } from './diagnostico.js';

async function loopPrincipal() {
    const dados = await buscarDados();
    if (!dados) return;

    atualizarMapa(dados.alertas);
    atualizarGraficos(dados.sensores, Math.floor(Date.now() / 1000));
    atualizarDiagnostico(dados.rede);
}

window.addEventListener("load", async () => {
    if (!document.getElementById("map-page")) return;
    
    checkAuth();
    iniciarUI();
    iniciarGrafico();
    
    const dadosIniciais = await buscarDados();
    if (dadosIniciais) {
        iniciarMapa(dadosIniciais.estacoes);
    }

    setInterval(loopPrincipal, 5000);
});