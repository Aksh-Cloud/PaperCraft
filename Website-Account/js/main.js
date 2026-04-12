// ============================================================
// PaperCraft Account — main.js
// ============================================================

// --- Pixel Particles ---
(function initParticles() {
    const container = document.getElementById('particles');
    if (!container) return;
    const colors = ['#3b82f6', '#60a5fa', '#22d3ee', '#38bdf8', '#1d4ed8'];
    for (let i = 0; i < 24; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        p.style.cssText = `
            left:${Math.random()*100}%;top:${-Math.random()*20}%;
            width:${Math.random()<.5?4:6}px;height:${Math.random()<.5?4:6}px;
            background:${colors[Math.floor(Math.random()*colors.length)]};
            animation-duration:${8+Math.random()*16}s;
            animation-delay:${-Math.random()*20}s;
            opacity:${.2+Math.random()*.4};`;
        container.appendChild(p);
    }
})();

// --- Active nav link ---
(function highlightNav() {
    const path = window.location.pathname;
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active',
            !!link.getAttribute('href') && path.endsWith(link.getAttribute('href')));
    });
})();

// --- Sign Out ---
const signOutBtn = document.getElementById('signOutBtn');
if (signOutBtn) {
    signOutBtn.addEventListener('click', async () => {
        await PCAuth.signOut();
        window.location.href = 'login.html';
    });
}

// --- Verified badge helper ---
window.renderVerifiedBadge = function(container, isVerified) {
    const old = container.querySelector('.verified-badge');
    if (old) old.remove();
    if (isVerified) {
        const badge = document.createElement('span');
        badge.className = 'verified-badge';
        badge.title = 'Email verified';
        badge.innerHTML = `<svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
            <circle cx="10" cy="10" r="10" fill="#3b82f6"/>
            <path d="M6 10.5l2.5 2.5 5.5-5.5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        container.appendChild(badge);
    }
};

// --- Toast ---
window.showToast = function(message, type = 'default') {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.offsetHeight;
    toast.classList.add('show');
    clearTimeout(window._toastTimer);
    window._toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
};