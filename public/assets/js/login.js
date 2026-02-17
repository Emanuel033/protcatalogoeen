// ==========================================
// LÓGICA DE INICIO DE SESIÓN
// ==========================================
auth.onAuthStateChanged(user => {
    if (user) {
        showMsg("Sesión activa, redirigiendo...", "success");
        setTimeout(() => window.location.href = 'admin.html', 1000);
    }
});

function login() {
    const email = document.getElementById('email').value;
    const pass = document.getElementById('password').value;
    const btn = document.querySelector('button');
    
    if (!email || !pass) return showMsg("Completa todos los campos", "error");

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Entrando...';
    hideMsg();

    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            showMsg("¡Bienvenido!", "success");
            setTimeout(() => window.location.href = 'admin.html', 1000);
        })
        .catch((error) => {
            btn.disabled = false;
            btn.innerHTML = 'Iniciar Sesión <i class="fa-solid fa-arrow-right ml-2"></i>';
            let msg = "Error de credenciales";
            if(error.code === 'auth/too-many-requests') msg = "Demasiados intentos. Espera.";
            showMsg(msg, "error");
        });
}

function forgotPassword() {
    const email = document.getElementById('email').value;
    if(!email) return showMsg("Ingresa tu correo primero", "error");
    auth.sendPasswordResetEmail(email)
        .then(() => showMsg("Correo enviado", "success"))
        .catch(e => showMsg("Error: " + e.message, "error"));
}

function togglePassword() {
    const i = document.getElementById('password'), icon = document.getElementById('toggleIcon');
    i.type = i.type === "password" ? "text" : "password";
    icon.classList.toggle("fa-eye"); icon.classList.toggle("fa-eye-slash");
}

function showMsg(text, type) {
    const box = document.getElementById('status-msg');
    box.querySelector('span').innerText = text;
    box.classList.remove('hidden');
    box.className = `mt-4 text-center text-sm font-medium p-2 rounded-lg border flex items-center justify-center gap-2 fade-in ${type==='success'?'bg-green-50 text-green-600 border-green-100':'bg-red-50 text-red-600 border-red-100'}`;
    box.querySelector('i').className = type==='success' ? "fa-solid fa-check-circle" : "fa-solid fa-circle-exclamation";
}
function hideMsg() { document.getElementById('status-msg').classList.add('hidden'); }
function checkEnter(e) { if (e.key === "Enter") login(); }
