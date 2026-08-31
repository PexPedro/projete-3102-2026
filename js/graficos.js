let sensorChart;

export function iniciarGrafico() {
    const canvas = document.getElementById("sensorChart");
    if (!canvas || sensorChart) return;

    sensorChart = new Chart(canvas, {
        type: "line",
        data: {
            datasets: [
                { label: "Temperatura", borderColor: '#3b82f6', data: [] },
                { label: "Umidade", borderColor: '#10b981', data: [] },
                { label: "Pluviometria", borderColor: '#f59e0b', data: [] },
                { label: "Nível do rio", borderColor: '#8b5cf6', data: [] }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'nearest',
                    intersect: false
                },
                zoom: {
                    pan: {
                        enabled: true, 
                        mode: 'x'
                    },
                    zoom: {
                        wheel: {enabled: true},
                        pinch: {enabled: true},
                        mode: 'x'
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                intersect: false
            },
            scales: {
                x: { type: 'linear', title: { display: true, text: 'Tempo (s)' } },
                y: { beginAtZero: true, title: { display: true, text: 'Valor' } }
            }
        }
    });
}

export function atualizarGraficos(sensores, tempoAtual) {
    if (!sensorChart || !sensores || !sensores[1]) return;

    const estacao = sensores[1];

    // Injeta os dados que vieram do servidor (se o servidor zerou, virá 0)
    sensorChart.data.datasets[0].data.push({ x: tempoAtual, y: estacao.temperatura || 0 });
    sensorChart.data.datasets[1].data.push({ x: tempoAtual, y: estacao.umidade || 0 });
    sensorChart.data.datasets[2].data.push({ x: tempoAtual, y: estacao.pluviometria || 0 });
    sensorChart.data.datasets[3].data.push({ x: tempoAtual, y: estacao.nivelRio || 0 });

    // Remove pontos antigos (mantém os últimos 20)
    sensorChart.data.datasets.forEach(dataset => {
        if (dataset.data.length > 20) dataset.data.shift();
    });

    sensorChart.update();
}

window.toggleDataset = function(indice) {
    if (!sensorChart) return;
    const dataset = sensorChart.getDatasetMeta(indice);
    dataset.hidden = !dataset.hidden;
    sensorChart.update();
};

window.resetChartZoom = function() {
    if (!sensorChart) return;
    sensorChart.resetZoom();
};