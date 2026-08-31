export function iniciarUI() {
    window.openTab = function(tabId, event) {
        document.querySelectorAll(".content").forEach(c => c.classList.remove("active-content"));
        document.getElementById(tabId).classList.add("active-content");

        document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
        event.target.classList.add("active");

        if (tabId === 'alertas') {
            const badge = document.getElementById("badge-alertas");
            if (badge) badge.style.display = "none";
        }

        if (tabId !== 'map') {
            document.getElementById('painel-estacao').style.display = 'none';
        }
    };

    window.abrirRelatorio = () => document.getElementById("report-modal").style.display = "flex";
    window.fecharRelatorio = () => document.getElementById("report-modal").style.display = "none";
    
    window.salvarRelatorio = () => {
        const lista = document.getElementById("lista-relatorios");
        const instituicao = document.getElementById("instituicao").value;
        const situacao = document.getElementById("situacao").value;
        const documentacao = document.getElementById("documentacao").value;
        const nome = document.getElementById("nome").value;
        
        const card = document.createElement("div");
        card.className = "report-card";
        card.innerHTML = `
            <div class="report-title">Relatório ${lista.children.length + 1}</div>
            <div class="report-subtitle">${situacao}</div>
            <div class="report-date">${new Date().toLocaleDateString('pt-BR')}</div>
            <div class="report-details" style="display: none;">
                <p><strong>Nome:</strong> ${nome}</p>
                <p><strong>Instituição vinculada:</strong> ${instituicao}</p>
                <p><strong>Situação:</strong> ${situacao}</p>
                <p><strong>Documentação:</strong></p>
                <p class="doc-texto">${documentacao}</p>
            </div>
        `;

        const detalhes = card.querySelector(".report-details");
        card.onclick = () => detalhes.style.display = detalhes.style.display === "none" ? "block" : "none";

        lista.appendChild(card);
        fecharRelatorio();
    };
}