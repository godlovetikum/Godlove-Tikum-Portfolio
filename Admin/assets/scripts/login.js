    import { auth as Auth } from './auth.js';
    
    const EMAIL_RE = /^[^\s@]+@[^\s@]{1,}\.[^\s@]{2,}$/;
    
    const form     = document.getElementById('loginForm');
    const errEl    = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    // If already logged in, go straight to dashboard
    Auth.me().then((profile) => {
        Auth.setUser(profile);
        window.location.replace('/dashboard/');
    }).catch((gauthErr)=>{
        console.log(gauthErr)
    });
    
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = document.getElementById('loginEmail').value.trim();
        const password = document.getElementById('loginPassword').value;
        
        if (!email || !password){
            errEl.classList.add('visible');
            errEl.textContent = 'Enter your admin email and password to login';
            return;
        }
        
        if (!EMAIL_RE.test(email)) {
            errEl.classList.add('visible');
            errEl.textContent = 'Enter a valid email address to login';
            return;
        }
        if (password.length < 8){
            errEl.classList.add('visible');
            errEl.textContent = 'A valid login password consist of at least 8 characters.';
            return;
        }
    
        errEl.classList.remove('visible');
        errEl.textContent = '';
        loginBtn.disabled = true;
        loginBtn.textContent = 'Signing in…';
    
        try {
            await Auth.login({ email, password });
            window.location.replace = '/dashboard/';
        } catch (err) {
            errEl.textContent = err.message;
            errEl.classList.add('visible');
        } finally {
            loginBtn.disabled = false;
            loginBtn.textContent = 'Sign in';
        }
    });