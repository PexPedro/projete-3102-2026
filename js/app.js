import { checkAuth, buscarDados } from './api.js';
import { iniciarUI } from './ui.js';
import { iniciarMapa, atualizarMapa } from './mapa.js';
import { iniciarGrafico, atualizarGraficos } from './graficos.js';

async function loopPrincipal() {
    const dados = await buscarDados();
    if (!dados) return;

    atualizarMapa(dados.alertas, dados.sensores);
    atualizarGraficos(dados.sensores, Math.floor(Date.now() / 1000));
}

window.addEventListener("load", async () => {
    if (!document.getElementById("map-page")) return;
    
    checkAuth();
    iniciarUI();
    iniciarGrafico();
    
    const dadosIniciais = await buscarDados();
    if (dadosIniciais) {
        iniciarMapa(dadosIniciais.estacoes, dadosIniciais.sensores, dadosIniciais.alertas);
    }

    setInterval(loopPrincipal, 5000);
});