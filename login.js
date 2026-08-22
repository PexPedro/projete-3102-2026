// Removemos as constantes de usuário e senha. O frontend não sabe mais a resposta certa.

async function login() {
    // 1. Pega os valores exatamente como foram digitados na tela
    const user = document.getElementById("username").value; 
    const pass = document.getElementById("password").value; 

    try {
        // 2. O fetch é o "correio". Ele envia os dados para a porta 3000.
        const resposta = await fetch('http://localhost:3000/api/login', {
            method: 'POST', // Estamos enviando dados, então usamos POST
            headers: {
                'Content-Type': 'application/json' // Avisamos o servidor: "Vou mandar um texto em formato JSON"
            },
            // Empacotamos as variáveis user e pass no formato JSON que o servidor espera
            body: JSON.stringify({ usuario: user, senha: pass }) 
        });

        // 3. Abrimos a resposta que o servidor devolveu (lembre-se, ele devolve { sucesso: true } ou false)
        const dados = await resposta.json();

        // 4. Se o servidor disse que o sucesso é verdadeiro, autorizamos a entrada
        if (dados.sucesso === true) {
            sessionStorage.setItem('argos_auth', '1');
            window.location.href = 'index.html';
        } else {
            // Se devolveu falso, avisamos o usuário
            alert("Usuário ou senha incorretos.");
        }
        
    } catch (erro) {
        // Se o seu servidor no terminal estiver desligado, o fetch vai falhar e mostrar este alerta
        console.error("Erro de conexão:", erro);
        alert("Erro no sistema. O servidor está rodando?");
    }
}