let mapa;
let marcadores = {};

export function iniciarMapa(estacoes) {
    if (mapa) return;
    mapa = L.map('mapa-regiao').setView([-22.3, -45.9], 8);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(mapa);

    estacoes.forEach(est => {
        const icone = L.divIcon({
            className: "", iconSize: [25,41], iconAnchor: [12,41], popupAnchor: [1,-34],
            html: `<div class="marker-wrapper"><img src="https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png"><span id="badge-${est.id}" class="station-badge" style="display: none;"></span></div>`
        });
        
        marcadores[est.id] = L.marker([est.latitude, est.longitude], { icon: icone }).addTo(mapa);
        marcadores[est.id].bindPopup(`<b>${est.nome}</b>`);
    });
}

export function atualizarMapa(alertas) {
    if (!alertas) return;
    Object.keys(alertas).forEach(id => {
        const qtd = alertas[id].length;
        const badge = document.getElementById(`badge-${id}`);
        if (badge) {
            badge.textContent = qtd;
            badge.style.display = qtd > 0 ? "flex" : "none";
        }
    });
}