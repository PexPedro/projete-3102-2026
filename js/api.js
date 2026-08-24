import { CONFIG } from './config.js';

export function checkAuth() {
    if (!sessionStorage.getItem('argos_auth')) {
        window.location.href = 'login.html';
    }
}

export async function buscarDados() {
    const token = sessionStorage.getItem('argos_auth');
    try {
        const res = await fetch(`${CONFIG.API_URL}/dashboard`, {
            headers: { 'Authorization': token }
        });
        
        if (res.status === 401) throw new Error("Sessão inválida");
        return await res.json();
    } catch (e) {
        window.location.href = 'login.html';
        return null;
    }
}