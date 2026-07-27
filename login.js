// AUTENTICAÇÃO 
const USUARIO_VALIDO = "Equipe";
const HASH_SENHA = "9ec5adcb162fea7bdcefce818598776ef77423ee0f29bcbe8d5f564b7bd47703"; // SHA-256 da senha "3102".

// Para nova senha (F12):
//   crypto.subtle.digest('SHA-256', new TextEncoder().encode('SUA_SENHA'))
//     .then(h => console.log(
//       Array.from(new Uint8Array(h))
//         .map(b => b.toString(16).padStart(2, '0'))
//         .join('')
//     ));

async function hashTexto(texto) {

    const encoder   = new TextEncoder();        // Converte string - bytes (Uint8Array).
    const data      = encoder.encode(texto);     // Bytes da senha digitada.
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);

    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function login() {

    const user = document.getElementById("username").value; 
    const pass = document.getElementById("password").value; 
    const hashDigitado = await hashTexto(pass); // Calcula o hash da senha digitada.

    if (user === USUARIO_VALIDO && hashDigitado === HASH_SENHA) {
        sessionStorage.setItem('argos_auth', '1');
        window.location.href = 'index.html';
    } else {
        alert("Usuário ou senha incorretos.");
    }
}