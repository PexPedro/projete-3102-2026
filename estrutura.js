function login() {

    const user = document.getElementById("username").value; 
    const pass = document.getElementById("password").value; 

    if (user === "Equipe" && pass === "3102") {

        document.getElementById("login-page").style.display = "none";
        document.getElementById("map-page").style.display = "block";

    } else {

        alert("Usuário ou senha incorretos."); 

    }
}

function openTab(tabId){

    const contents = document.querySelectorAll(".content");
    contents.forEach(content => { 
        content.classList.remove("active-content");
    });

    document.getElementById(tabId).classList.add("active-content"); 

    const tabs = document.querySelectorAll(".tab");

    tabs.forEach(tab => { 
        tab.classList.remove("active");
    });

    event.target.classList.add("active"); 
}

function abrirRelatorio(){

    document.getElementById("report-modal").style.display = "flex";
}

function fecharRelatorio(){
    
    document.getElementById("report-modal").style.display = "none";
}

function limparFormulario(){

    document.getElementById("nome").value = "";
    document.getElementById("instituicao").value = "";
    document.getElementById("situacao").value = "";
    document.getElementById("documentacao").value = "";
}

function salvarRelatorio(){

    const nome =document.getElementById("nome").value;

    const instituicao = document.getElementById("instituicao").value;

    const situacao =document.getElementById("situacao").value;

    const documentacao = document.getElementById("documentacao").value;

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
            ${new Date().toLocaleDateString()}
        </div>
    `;

    card.onclick = function(){

        alert(
            "Nome: " + nome + "\n\n" +
            "Instituição: " + instituicao + "\n\n" +
            "Situação: " + situacao + "\n\n" +
            "Documentação:\n" + documentacao
        );
    };

    lista.appendChild(card);
    limparFormulario();
    fecharRelatorio();
}