import { buscarPrevisao } from './api.js';

async function atualizarPrevisao() {
    const dados = await buscarPrevisao();
    
    if (!dados) return;

    const previsaoEstacao1 = dados.previsoes ? dados.previsoes[1] : null;
    const elementoExibicao = document.getElementById('valor-previsao');

    if (elementoExibicao) {
        if (previsaoEstacao1 !== null && previsaoEstacao1 !== undefined) {
            elementoExibicao.innerText = previsaoEstacao1 + " cm"; 
        } else {
            elementoExibicao.innerText = "Aguardando dado da IA...";
        }
    }
}

document.addEventListener('DOMContentLoaded', atualizarPrevisao);
setInterval(atualizarPrevisao, 5000);