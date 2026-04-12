// ============================================================
// PaperCraft Account — auth.js  (Supabase version)
// ============================================================

// --- Password toggle ---
document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
        const input = btn.previousElementSibling;
        const isPass = input.type === 'password';
        input.type = isPass ? 'text' : 'password';
        btn.querySelector('.eye-open').style.display  = isPass ? 'none' : '';
        btn.querySelector('.eye-closed').style.display = isPass ? '' : 'none';
    });
});

// --- Password strength (signup only) ---
const pwField       = document.getElementById('password');
const strengthFill  = document.getElementById('strengthFill');
const strengthLabel = document.getElementById('strengthLabel');

function getStrength(pw) {
    let s = 0;
    if (pw.length >= 8)  s++;
    if (pw.length >= 12) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
}

if (pwField && strengthFill && strengthLabel) {
    pwField.addEventListener('input', () => {
        const pw = pwField.value;
        if (!pw) { strengthFill.className='strength-fill'; strengthLabel.textContent='Enter password'; return; }
        const levels = [['',''],['w25','Very weak'],['w50','Weak'],['w75','Good'],['w75','Strong'],['w100','Very strong']];
        const [cls, lbl] = levels[Math.min(getStrength(pw), 5)];
        strengthFill.className = `strength-fill ${cls}`;
        strengthLabel.textContent = lbl;
    });
}

// --- Validation helpers ---
function showError(id, msg)  { const el = document.getElementById(id); if (el) el.textContent = msg; }
function clearError(id)      { const el = document.getElementById(id); if (el) el.textContent = ''; }
function setFormError(msg)   {
    const el = document.getElementById('formError');
    if (!el) return;
    el.textContent = msg;
    el.classList.toggle('visible', !!msg);
}
function setLoading(on) {
    const btn  = document.getElementById('submitBtn');
    if (!btn) return;
    const text = btn.querySelector('.btn-text');
    const load = btn.querySelector('.btn-loader');
    btn.disabled = on;
    if (text) text.style.display = on ? 'none' : '';
    if (load) load.hidden = !on;
}

// ============================================================
// LOGIN FORM
// ============================================================
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        clearError('emailError'); clearError('passwordError'); setFormError('');

        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        let valid = true;

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('emailError', 'Enter a valid email address.'); valid = false;
        }
        if (!password) {
            showError('passwordError', 'Enter your password.'); valid = false;
        }
        if (!valid) return;

        setLoading(true);

        const { data, error } = await PCAuth.client.auth.signInWithPassword({ email, password });

        setLoading(false);

        if (error) {
            setFormError(error.message || 'Incorrect email or password.');
            return;
        }

        window.location.href = 'profile.html';
    });
}

// ============================================================
// SIGNUP FORM
// ============================================================
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        ['usernameError','emailError','passwordError','confirmPasswordError','termsError']
            .forEach(id => clearError(id));
        setFormError('');

        const username = document.getElementById('username').value.trim();
        const email    = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirm  = document.getElementById('confirmPassword').value;
        const terms    = document.getElementById('terms').checked;
        let valid = true;

        if (!username || username.length < 3 || username.length > 15 || !/^[a-zA-Z0-9_]+$/.test(username)) {
            showError('usernameError', 'Username must be 3–15 letters, numbers or underscores.'); valid = false;
        }
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            showError('emailError', 'Enter a valid email address.'); valid = false;
        }
        if (!password || getStrength(password) < 2) {
            showError('passwordError', 'Password is too weak. Use at least 8 characters.'); valid = false;
        }
        if (password !== confirm) {
            showError('confirmPasswordError', 'Passwords do not match.'); valid = false;
        }
        if (!terms) {
            showError('termsError', 'You must agree to the Terms of Service.'); valid = false;
        }
        if (!valid) return;

        setLoading(true);

        // Check username uniqueness before signing up
        const { data: existing } = await PCAuth.client
            .from('profiles')
            .select('id')
            .ilike('username', username)
            .maybeSingle();

        if (existing) {
            setLoading(false);
            showError('usernameError', 'This username is already taken.');
            return;
        }

        // Create auth user — email confirmation is OFF by default in Supabase settings
        // (users can request verification later from profile settings)
        const { data, error } = await PCAuth.client.auth.signUp({
            email,
            password,
            options: {
                data: { username },         // stored in auth.users.raw_user_meta_data
                emailRedirectTo: undefined, // no redirect — we handle verification manually
            }
        });

        if (error) {
            setLoading(false);
            setFormError(error.message || 'Could not create account. Try again.');
            return;
        }

        // Insert profile row (trigger also does this as fallback — see SQL setup)
        const userId = data.user?.id;
        if (userId) {
            await PCAuth.client.from('profiles').upsert({
                id:             userId,
                username:       username,
                email_verified: false,
                join_date:      new Date().toISOString(),
            });
            await PCAuth.client.from('stats').upsert({
                user_id:       userId,
                blocks_mined:  0,
                blocks_placed: 0,
                kills:         0,
                deaths:        0,
                worlds:        0,
                playtime:      0,
            });
        }

        setLoading(false);
        window.location.href = 'profile.html';
    });
}