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

    const contents =
        document.querySelectorAll(".content");

    contents.forEach(content => {
        content.classList.remove("active-content");
    });

    document
        .getElementById(tabId)
        .classList
        .add("active-content");

    const tabs =
        document.querySelectorAll(".tab");

    tabs.forEach(tab => {
        tab.classList.remove("active");
    });

    event.target.classList.add("active");
}