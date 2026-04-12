// ============================================================
// PaperCraft Account — profile.js  (Supabase version)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {
    const gate    = document.getElementById('authGate');
    const content = document.getElementById('dashboardContent');

    // Wait for Supabase session to be ready
    const user = await PCAuth.getUserAsync();

    if (!user) {
        if (gate)    gate.hidden = false;
        if (content) content.style.display = 'none';
        return;
    }

    if (gate)    gate.hidden = true;
    if (content) content.style.display = '';

    // ── Populate header ───────────────────────────────────────
    const usernameEl = document.getElementById('profileUsername');
    const emailEl    = document.getElementById('profileEmail');
    const joinEl     = document.getElementById('joinDate');

    if (usernameEl) {
        usernameEl.textContent = user.username || 'Player';
        // Render verified badge next to username
        renderVerifiedBadge(usernameEl.parentElement || usernameEl, user.emailVerified);
    }
    if (emailEl)  emailEl.textContent  = user.email    || '';
    if (joinEl)   joinEl.textContent   = new Date(user.joinDate || Date.now())
        .toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });

    // ── Load stats from Supabase ──────────────────────────────
    const { data: stats } = await PCAuth.client
        .from('stats')
        .select('blocks_mined, blocks_placed, kills, deaths, worlds, playtime')
        .eq('user_id', user.uuid)
        .single();

    if (stats) {
        const fmt = n => n >= 1000 ? (n/1000).toFixed(1)+'K' : n;
        const set = (id, val) => { const el=document.getElementById(id); if(el) el.textContent=val; };
        set('stat-blocks',  fmt(stats.blocks_mined  || 0));
        set('stat-placed',  fmt(stats.blocks_placed || 0));
        set('stat-kills',   fmt(stats.kills         || 0));
        set('stat-deaths',  fmt(stats.deaths        || 0));
        set('stat-worlds',  fmt(stats.worlds        || 0));
        set('stat-time',   (stats.playtime          || 0) + 'h');
    }

    // ── Load avatar from Supabase Storage ────────────────────
    if (user.avatarUrl) {
        const { data: { publicUrl } } = PCAuth.client
            .storage.from('skins')
            .getPublicUrl(user.avatarUrl);
        applyAvatarSkin(publicUrl);
    }

    // ── Skin upload (Supabase Storage bucket: skins) ──────────
    const changeSkinBtn  = document.getElementById('changeSkinBtn');
    const skinModal      = document.getElementById('skinModal');
    const skinDropArea   = document.getElementById('skinDropArea');
    const skinFileInput  = document.getElementById('skinFileInput');
    const applySkinBtn   = document.getElementById('applySkin');
    const cancelSkin     = document.getElementById('cancelSkin');
    const closeSkinModal = document.getElementById('closeSkinModal');
    const clearSkinBtn   = document.getElementById('clearSkinBtn');
    let pendingSkinFile  = null;

    changeSkinBtn?.addEventListener('click', () => { skinModal.hidden = false; });
    [cancelSkin, closeSkinModal].forEach(el =>
        el?.addEventListener('click', () => { skinModal.hidden=true; pendingSkinFile=null; if(applySkinBtn) applySkinBtn.disabled=true; }));

    skinDropArea?.addEventListener('dragover', e => { e.preventDefault(); skinDropArea.classList.add('drag-over'); });
    skinDropArea?.addEventListener('dragleave', () => skinDropArea.classList.remove('drag-over'));
    skinDropArea?.addEventListener('drop', e => {
        e.preventDefault(); skinDropArea.classList.remove('drag-over');
        if (e.dataTransfer.files[0]) readSkinFile(e.dataTransfer.files[0]);
    });
    skinFileInput?.addEventListener('change', () => {
        if (skinFileInput.files[0]) readSkinFile(skinFileInput.files[0]);
    });

    function readSkinFile(file) {
        if (!file.type.includes('png')) { showToast('Please upload a PNG file.', 'error'); return; }
        pendingSkinFile = file;
        if (applySkinBtn) applySkinBtn.disabled = false;
        const reader = new FileReader();
        reader.onload = ev => {
            if (skinDropArea) skinDropArea.innerHTML =
                `<img src="${ev.target.result}" style="width:64px;height:64px;image-rendering:pixelated;border:2px solid var(--border2)"><p>Skin ready to apply</p>`;
        };
        reader.readAsDataURL(file);
    }

    applySkinBtn?.addEventListener('click', async () => {
        if (!pendingSkinFile) return;
        applySkinBtn.disabled = true;
        applySkinBtn.textContent = 'Uploading…';

        const path = `${user.uuid}/skin.png`;

        // Upload to 'skins' bucket (upsert = overwrite)
        const { error: uploadErr } = await PCAuth.client
            .storage.from('skins')
            .upload(path, pendingSkinFile, { upsert: true, contentType: 'image/png' });

        if (uploadErr) {
            showToast('Upload failed: ' + uploadErr.message, 'error');
            applySkinBtn.disabled = false;
            applySkinBtn.textContent = 'Apply Skin';
            return;
        }

        // Save path in profiles table
        await PCAuth.client
            .from('profiles')
            .update({ avatar_url: path })
            .eq('id', user.uuid);

        // Display
        const { data: { publicUrl } } = PCAuth.client.storage.from('skins').getPublicUrl(path);
        applyAvatarSkin(publicUrl);

        skinModal.hidden = true;
        pendingSkinFile  = null;
        applySkinBtn.disabled   = false;
        applySkinBtn.textContent = 'Apply Skin';
        showToast('Skin applied!', 'success');
    });

    clearSkinBtn?.addEventListener('click', async () => {
        // Remove from bucket
        await PCAuth.client.storage.from('skins').remove([`${user.uuid}/skin.png`]);
        // Clear in profile
        await PCAuth.client.from('profiles').update({ avatar_url: null }).eq('id', user.uuid);
        const fig = document.getElementById('profileAvatar');
        if (fig) fig.innerHTML = '<div class="avatar-skin"><div class="sk-head"></div><div class="sk-body"></div><div class="sk-leg left"></div><div class="sk-leg right"></div></div>';
        showToast('Skin reset to default.', 'default');
    });

    function applyAvatarSkin(url) {
        const fig = document.getElementById('skinFigure');
        if (fig) fig.style.backgroundImage = `url(${url})`;
        // Also update the avatar preview if present
        const prev = document.getElementById('skinPreviewImg');
        if (prev) { prev.src = url; prev.hidden = false; }
    }

    // ── Worlds (still game-local; synced via localStorage) ───
    refreshWorldsList();

    document.getElementById('newWorldBtn')?.addEventListener('click', () => {
        window.location.href = '../game.html';
    });

    function refreshWorldsList() {
        const list     = document.getElementById('worldsList');
        if (!list) return;
        const savedRaw = localStorage.getItem('worlds');
        const worlds   = savedRaw ? JSON.parse(savedRaw) : [];
        list.querySelectorAll('.world-item').forEach(el => el.remove());

        if (worlds.length === 0) {
            const empty = document.getElementById('worldsEmpty');
            if (empty) empty.hidden = false;
            return;
        }
        const empty = document.getElementById('worldsEmpty');
        if (empty) empty.hidden = true;

        worlds.slice().reverse().forEach(w => {
            const div = document.createElement('div');
            div.className = 'world-item';
            div.innerHTML = `
                <div class="world-thumb">
                    <div class="wt-grass"></div><div class="wt-dirt"></div><div class="wt-stone"></div>
                </div>
                <div class="world-info">
                    <div class="world-name">${escHtml(w.name||'World')}</div>
                    <div class="world-meta">Last played ${relativeDate(w.lastPlayed)}</div>
                </div>
                <div class="world-actions">
                    <button class="wa-btn play" title="Play" data-id="${w.id}">▶</button>
                    <button class="wa-btn del"  title="Delete" data-id="${w.id}">✕</button>
                </div>`;
            list.insertBefore(div, list.firstChild);
        });

        list.addEventListener('click', e => {
            const btn = e.target.closest('.wa-btn');
            if (!btn) return;
            const id = parseInt(btn.dataset.id);
            if (btn.classList.contains('play')) {
                localStorage.setItem('selectedWorld', JSON.stringify({ id, name: '' }));
                window.location.href = '../game.html';
            } else if (btn.classList.contains('del')) {
                if (!confirm('Delete this world?')) return;
                const ws = JSON.parse(localStorage.getItem('worlds') || '[]');
                localStorage.setItem('worlds', JSON.stringify(ws.filter(w => w.id !== id)));
                localStorage.removeItem(String(id));
                refreshWorldsList();
                showToast('World deleted.', 'default');
            }
        });
    }
});

function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
function relativeDate(iso) {
    if (!iso) return 'Never';
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60)    return 'Just now';
    if (diff < 3600)  return Math.floor(diff/60)   + ' min ago';
    if (diff < 86400) return Math.floor(diff/3600)  + ' hours ago';
    return Math.floor(diff/86400) + ' days ago';
}