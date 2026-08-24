export function atualizarDiagnostico(redeEstacoes) {
    const container = document.getElementById('rede-cards');
    if (!container || !redeEstacoes) return;

    container.innerHTML = '';
    
    redeEstacoes.forEach(con => {
        const card = document.createElement('div');
        card.className = 'rede-card';
        card.innerHTML = `
            <div class="rede-card-header">
                <div class="rede-card-title">Estação ${con.de} ➔ ${con.para}</div>
                <span class="status-badge status-${con.qualidade}">${con.qualidade}</span>
            </div>
        `;
        container.appendChild(card);
    });
}