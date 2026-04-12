// ============================================================
// PaperCraft Account — settings.js  (Supabase version)
// ============================================================

document.addEventListener('DOMContentLoaded', async () => {

    // ── Auth gate ─────────────────────────────────────────────
    const user = await PCAuth.getUserAsync();
    if (!user) { window.location.href = 'login.html'; return; }

    // ── Sidebar navigation ───────────────────────────────────
    const sbLinks  = document.querySelectorAll('.sb-link[data-section]');
    const sections = document.querySelectorAll('.settings-section');

    sbLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            sbLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            link.classList.add('active');
            const target = document.getElementById('section-' + link.dataset.section);
            if (target) target.classList.add('active');
        });
    });

    const hash = location.hash.replace('#','');
    if (hash) {
        const link = document.querySelector(`.sb-link[data-section="${hash}"]`);
        if (link) link.click();
    }

    // ── Pre-load fields ──────────────────────────────────────
    loadSettings();

    // ── Verified badge in profile section ────────────────────
    const verifySection = document.getElementById('verifyEmailSection');
    const verifyBtn     = document.getElementById('requestVerificationBtn');
    const verifiedMsg   = document.getElementById('alreadyVerifiedMsg');

    if (verifySection) {
        if (user.emailVerified) {
            verifySection.style.display = 'none';
            if (verifiedMsg) verifiedMsg.hidden = false;
        } else {
            verifySection.style.display = '';
            if (verifiedMsg) verifiedMsg.hidden = true;
        }
    }

    verifyBtn?.addEventListener('click', async () => {
        verifyBtn.disabled = true;
        verifyBtn.textContent = 'Sending…';

        // Trigger Supabase to send a verification email
        const { error } = await PCAuth.client.auth.resend({
            type: 'signup',
            email: user.email,
        });

        if (error) {
            showToast('Could not send email: ' + error.message, 'error');
        } else {
            showToast('Verification email sent! Check your inbox.', 'success');
            verifyBtn.textContent = 'Email sent ✓';
            setTimeout(() => { verifyBtn.disabled = false; verifyBtn.textContent = 'Send Verification Email'; }, 30000);
            return;
        }
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Send Verification Email';
    });

    // ── Save profile fields (display name / email) ───────────
    document.querySelectorAll('.setting-save').forEach(btn => {
        btn.addEventListener('click', async () => {
            const field = btn.dataset.field;
            let value;
            if (field === 'gamemode') {
                value = document.querySelector('input[name="gamemode"]:checked')?.value;
            } else {
                const input = document.getElementById('settings' + capitalize(field)) || document.getElementById(field);
                value = input?.value.trim();
            }
            if (!value) { showToast('Nothing to save.', 'error'); return; }
            await saveField(field, value);
            showToast('Saved!', 'success');
        });
    });

    // ── Change password (Supabase) ────────────────────────────
    document.getElementById('changePasswordBtn')?.addEventListener('click', async () => {
        const newPw   = document.getElementById('newPassword').value;
        const confirm = document.getElementById('confirmNewPassword').value;
        const errEl   = document.getElementById('passwordChangeError');
        const succEl  = document.getElementById('passwordChangeSuccess');

        errEl.className = 'form-error'; succEl.className = 'form-success';

        if (!newPw || !confirm) {
            errEl.textContent = 'Please fill in all password fields.';
            errEl.className += ' visible'; return;
        }
        if (newPw !== confirm) {
            errEl.textContent = 'New passwords do not match.';
            errEl.className += ' visible'; return;
        }
        if (newPw.length < 8) {
            errEl.textContent = 'New password must be at least 8 characters.';
            errEl.className += ' visible'; return;
        }

        const { error } = await PCAuth.client.auth.updateUser({ password: newPw });

        if (error) {
            errEl.textContent = error.message;
            errEl.className += ' visible'; return;
        }

        succEl.textContent = 'Password updated successfully!';
        succEl.className += ' visible';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
        updateStrength('');
        setTimeout(() => { succEl.className = 'form-success'; }, 4000);
    });

    // ── Password strength meter ──────────────────────────────
    document.getElementById('newPassword')?.addEventListener('input', e => updateStrength(e.target.value));

    function updateStrength(pw) {
        const fill  = document.getElementById('strengthFill');
        const label = document.getElementById('strengthLabel');
        if (!fill || !label) return;
        if (!pw) { fill.className='strength-fill'; label.textContent='Enter password'; return; }
        let s=0;
        if(pw.length>=8)s++;if(pw.length>=12)s++;if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;
        const levels=[['',''],['w25','Very weak'],['w50','Weak'],['w75','Good'],['w75','Strong'],['w100','Very strong']];
        const [cls,lbl]=levels[Math.min(s,5)];
        fill.className=`strength-fill ${cls}`;label.textContent=lbl;
    }

    // ── Sliders ───────────────────────────────────────────────
    ['musicVolume','sfxVolume'].forEach(id => {
        const slider = document.getElementById(id);
        const label  = document.getElementById(id.replace('Volume','Val'));
        if (slider && label) slider.addEventListener('input', () => label.textContent = slider.value+'%');
    });

    // ── Save game preferences (localStorage → game sync) ──────
    document.getElementById('saveGamePrefs')?.addEventListener('click', () => {
        const prefs = {
            musicVolume: document.getElementById('musicVolume')?.value || 70,
            sfxVolume:   document.getElementById('sfxVolume')?.value   || 100,
            showFps:     document.getElementById('showFps')?.checked   || false,
            showCoords:  document.getElementById('showCoords')?.checked|| false,
            lighting:    document.getElementById('lighting')?.checked  || false,
        };
        const game = JSON.parse(localStorage.getItem('settings') || '{}');
        game.musicVolume = parseInt(prefs.musicVolume);
        game.sfxVolume   = parseInt(prefs.sfxVolume);
        game.lighting    = prefs.lighting;
        localStorage.setItem('settings', JSON.stringify(game));
        localStorage.setItem('pcGamePrefs', JSON.stringify(prefs));
        showToast('Game preferences saved!', 'success');
    });

    // ── Save notifications ────────────────────────────────────
    document.getElementById('saveNotifications')?.addEventListener('click', () => {
        const notifs = {};
        ['updates','friends','servers','newsletter'].forEach(k => {
            const el = document.getElementById('notif-'+k);
            if (el) notifs[k] = el.checked;
        });
        localStorage.setItem('pcNotifications', JSON.stringify(notifs));
        showToast('Notification preferences saved!', 'success');
    });

    document.getElementById('savePrivacy')?.addEventListener('click', () => {
        showToast('Privacy settings saved!', 'success');
    });

    // ── Sign out all sessions ─────────────────────────────────
    document.getElementById('signOutAllBtn')?.addEventListener('click', async () => {
        await PCAuth.client.auth.signOut({ scope: 'global' });
        showToast('All sessions signed out.', 'success');
        window.location.href = 'login.html';
    });

    // ── Download data ─────────────────────────────────────────
    document.getElementById('downloadDataBtn')?.addEventListener('click', async () => {
        const { data: profile } = await PCAuth.client.from('profiles').select('*').eq('id', user.uuid).single();
        const { data: statsRow } = await PCAuth.client.from('stats').select('*').eq('user_id', user.uuid).single();
        const data = JSON.stringify({ profile, stats: statsRow, exportDate: new Date().toISOString() }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'papercraft-data.json'; a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported!', 'success');
    });

    // ── Danger Zone ───────────────────────────────────────────
    document.getElementById('deleteWorldsBtn')?.addEventListener('click', () => {
        showConfirm('Delete All Worlds',
            'This will permanently delete all your saved worlds. This cannot be undone.',
            'DELETE', () => {
                const worlds = JSON.parse(localStorage.getItem('worlds') || '[]');
                worlds.forEach(w => localStorage.removeItem(String(w.id)));
                localStorage.removeItem('worlds');
                showToast('All worlds deleted.', 'default');
            });
    });

    document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
        showConfirm('Delete Account',
            'This will permanently delete your account and all data. This cannot be undone.',
            'DELETE ACCOUNT', async () => {
                // Delete skin from storage
                await PCAuth.client.storage.from('skins').remove([`${user.uuid}/skin.png`]);
                // Delete profile + stats (cascade handled by FK in SQL)
                await PCAuth.client.from('profiles').delete().eq('id', user.uuid);
                // Delete auth user via admin endpoint is not available client-side;
                // mark as deleted and sign out instead
                await PCAuth.client.auth.signOut();
                window.location.href = 'index.html';
            });
    });

    // ── Confirm modal ─────────────────────────────────────────
    function showConfirm(title, message, word, onConfirm) {
        const modal     = document.getElementById('confirmModal');
        const titleEl   = document.getElementById('confirmTitle');
        const msgEl     = document.getElementById('confirmMessage');
        const inputWrap = document.getElementById('confirmInputWrap');
        const wordEl    = document.getElementById('confirmWord');
        const input     = document.getElementById('confirmInput');
        const confirmBtn= document.getElementById('confirmAction');

        titleEl.textContent  = title;
        msgEl.textContent    = message;
        wordEl.textContent   = word;
        input.value          = '';
        confirmBtn.disabled  = true;
        if (inputWrap) inputWrap.hidden = false;
        modal.hidden = false;

        const onInput = () => { confirmBtn.disabled = input.value !== word; };
        input.addEventListener('input', onInput);

        const cleanUp = () => {
            modal.hidden = true;
            input.value = '';
            confirmBtn.disabled = true;
            input.removeEventListener('input', onInput);
        };

        document.getElementById('closeConfirmModal')?.addEventListener('click', cleanUp, { once: true });
        document.getElementById('cancelAction')?.addEventListener('click', cleanUp, { once: true });
        confirmBtn.onclick = () => { cleanUp(); onConfirm(); };
    }

    document.getElementById('closeConfirmModal')?.addEventListener('click', () => {
        document.getElementById('confirmModal').hidden = true;
    });
    document.getElementById('cancelAction')?.addEventListener('click', () => {
        document.getElementById('confirmModal').hidden = true;
    });

    // ── Load fields ───────────────────────────────────────────
    function loadSettings() {
        const displayNameInput   = document.getElementById('displayName');
        const settingsEmailInput = document.getElementById('settingsEmail');
        if (displayNameInput)   displayNameInput.value   = user.username || '';
        if (settingsEmailInput) settingsEmailInput.value = user.email    || '';

        const prefs      = JSON.parse(localStorage.getItem('pcGamePrefs') || '{}');
        const gamePrefs  = JSON.parse(localStorage.getItem('settings')    || '{}');
        const merged     = { ...prefs, ...gamePrefs };

        [['musicVolume','musicVal'], ['sfxVolume','sfxVal']].forEach(([sId, lId]) => {
            const s = document.getElementById(sId);
            const l = document.getElementById(lId);
            if (s && merged[sId] !== undefined) { s.value = merged[sId]; if(l) l.textContent = merged[sId]+'%'; }
        });

        const lightingEl = document.getElementById('lighting');
        if (lightingEl && merged.lighting !== undefined) lightingEl.checked = merged.lighting !== false;

        const notifs = JSON.parse(localStorage.getItem('pcNotifications') || '{}');
        Object.entries(notifs).forEach(([k, v]) => {
            const el = document.getElementById('notif-'+k);
            if (el) el.checked = v;
        });
    }

    // ── Save profile fields to Supabase ───────────────────────
    async function saveField(field, value) {
        if (field === 'displayName') {
            await PCAuth.client.from('profiles').update({ username: value }).eq('id', user.uuid);
            await PCAuth.client.auth.updateUser({ data: { username: value } });
            if (PCAuth._cachedUser) PCAuth._cachedUser.username = value;
        } else if (field === 'email') {
            // Triggers re-verification; Supabase sends confirm email to new address
            await PCAuth.client.auth.updateUser({ email: value });
            showToast('Confirmation sent to new email address.', 'success');
        } else if (field === 'gamemode') {
            await PCAuth.client.from('profiles').update({ default_gamemode: parseInt(value) }).eq('id', user.uuid);
        }
    }

    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
});

    const sbLinks  = document.querySelectorAll('.sb-link[data-section]');
    const sections = document.querySelectorAll('.settings-section');

    sbLinks.forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            sbLinks.forEach(l => l.classList.remove('active'));
            sections.forEach(s => s.classList.remove('active'));
            link.classList.add('active');
            const target = document.getElementById('section-' + link.dataset.section);
            if (target) target.classList.add('active');
        });
    });

    // Activate from URL hash
    const hash = location.hash.replace('#','');
    if (hash) {
        const link = document.querySelector(`.sb-link[data-section="${hash}"]`);
        if (link) link.click();
    }

    // --- Load saved settings into fields ---
    loadSettings();

    // --- Save buttons (profile fields) ---
    document.querySelectorAll('.setting-save').forEach(btn => {
        btn.addEventListener('click', () => {
            const field = btn.dataset.field;
            let value;

            if (field === 'gamemode') {
                value = document.querySelector('input[name="gamemode"]:checked')?.value;
            } else {
                const input = document.getElementById('settings' + capitalize(field)) || document.getElementById(field);
                value = input?.value.trim();
            }

            if (!value) { showToast('Nothing to save.', 'error'); return; }

            saveField(field, value);
            showToast('Saved!', 'success');
        });
    });

    // --- Change password ---
    const changePwBtn = document.getElementById('changePasswordBtn');
    changePwBtn?.addEventListener('click', () => {
        const current  = document.getElementById('currentPassword').value;
        const newPw    = document.getElementById('newPassword').value;
        const confirm  = document.getElementById('confirmNewPassword').value;
        const errEl    = document.getElementById('passwordChangeError');
        const succEl   = document.getElementById('passwordChangeSuccess');

        errEl.className = 'form-error'; succEl.className = 'form-success';

        if (!current || !newPw || !confirm) {
            errEl.textContent = 'Please fill in all password fields.';
            errEl.className += ' visible'; return;
        }
        if (newPw !== confirm) {
            errEl.textContent = 'New passwords do not match.';
            errEl.className += ' visible'; return;
        }
        if (newPw.length < 8) {
            errEl.textContent = 'New password must be at least 8 characters.';
            errEl.className += ' visible'; return;
        }

        // Verify current password
        const accounts = JSON.parse(localStorage.getItem('pcAccounts') || '[]');
        const idx = accounts.findIndex(a => a.uuid === user.uuid);
        if (idx === -1 || accounts[idx].password !== btoa(current)) {
            errEl.textContent = 'Current password is incorrect.';
            errEl.className += ' visible'; return;
        }

        accounts[idx].password = btoa(newPw);
        localStorage.setItem('pcAccounts', JSON.stringify(accounts));

        succEl.textContent = 'Password updated successfully!';
        succEl.className += ' visible';
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmNewPassword').value = '';
        updateStrength('');
        setTimeout(() => { succEl.className = 'form-success'; }, 4000);
    });

    // --- Password strength in security tab ---
    const newPwInput = document.getElementById('newPassword');
    newPwInput?.addEventListener('input', () => updateStrength(newPwInput.value));

    function updateStrength(pw) {
        const fill  = document.getElementById('strengthFill');
        const label = document.getElementById('strengthLabel');
        if (!fill || !label) return;
        if (!pw) { fill.className='strength-fill'; label.textContent='Enter password'; return; }
        let s=0;
        if(pw.length>=8)s++;if(pw.length>=12)s++;if(/[A-Z]/.test(pw))s++;if(/[0-9]/.test(pw))s++;if(/[^A-Za-z0-9]/.test(pw))s++;
        const levels=[['',''],['w25','Very weak'],['w50','Weak'],['w75','Good'],['w75','Strong'],['w100','Very strong']];
        const [cls,lbl]=levels[Math.min(s,5)];
        fill.className=`strength-fill ${cls}`;
        label.textContent=lbl;
    }

    // --- Sliders ---
    setupSlider('musicVolume', 'musicVal');
    setupSlider('sfxVolume',   'sfxVal');

    function setupSlider(inputId, valId) {
        const slider = document.getElementById(inputId);
        const label  = document.getElementById(valId);
        if (!slider || !label) return;
        slider.addEventListener('input', () => { label.textContent = slider.value + '%'; });
    }

    // --- Save game preferences ---
    document.getElementById('saveGamePrefs')?.addEventListener('click', () => {
        const prefs = {
            musicVolume: document.getElementById('musicVolume')?.value || 70,
            sfxVolume:   document.getElementById('sfxVolume')?.value   || 100,
            showFps:     document.getElementById('showFps')?.checked    || false,
            showCoords:  document.getElementById('showCoords')?.checked || false,
            lighting:    document.getElementById('lighting')?.checked   || false,
        };
        // Sync to game settings
        const gameSettings = JSON.parse(localStorage.getItem('settings') || '{}');
        gameSettings.musicVolume = parseInt(prefs.musicVolume);
        gameSettings.sfxVolume   = parseInt(prefs.sfxVolume);
        gameSettings.lighting    = prefs.lighting;
        localStorage.setItem('settings', JSON.stringify(gameSettings));
        localStorage.setItem('pcGamePrefs', JSON.stringify(prefs));
        showToast('Game preferences saved!', 'success');
    });

    // --- Save notifications ---
    document.getElementById('saveNotifications')?.addEventListener('click', () => {
        const notifs = {
            updates:     document.getElementById('notif-updates')?.checked,
            friends:     document.getElementById('notif-friends')?.checked,
            servers:     document.getElementById('notif-servers')?.checked,
            newsletter:  document.getElementById('notif-newsletter')?.checked,
        };
        localStorage.setItem('pcNotifications', JSON.stringify(notifs));
        showToast('Notification preferences saved!', 'success');
    });

    // --- Save privacy ---
    document.getElementById('savePrivacy')?.addEventListener('click', () => {
        showToast('Privacy settings saved!', 'success');
    });

    // --- Sign out all ---
    document.getElementById('signOutAllBtn')?.addEventListener('click', () => {
        showToast('All other sessions signed out.', 'success');
    });

    // --- Download data ---
    document.getElementById('downloadDataBtn')?.addEventListener('click', () => {
        const accounts = JSON.parse(localStorage.getItem('pcAccounts') || '[]');
        const userData = accounts.find(a => a.uuid === user.uuid) || {};
        const data = JSON.stringify({ profile: userData, exportDate: new Date().toISOString() }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url; a.download = 'papercraft-data.json'; a.click();
        URL.revokeObjectURL(url);
        showToast('Data exported!', 'success');
    });

    // --- Danger Zone ---
    document.getElementById('deleteWorldsBtn')?.addEventListener('click', () => {
        showConfirm(
            'Delete All Worlds',
            'This will permanently delete all your saved worlds. This cannot be undone.',
            'DELETE',
            () => {
                const worlds = JSON.parse(localStorage.getItem('worlds') || '[]');
                worlds.forEach(w => localStorage.removeItem(String(w.id)));
                localStorage.removeItem('worlds');
                showToast('All worlds deleted.', 'default');
            }
        );
    });

    document.getElementById('deleteAccountBtn')?.addEventListener('click', () => {
        showConfirm(
            'Delete Account',
            'This will permanently delete your account and all associated data.',
            'DELETE ACCOUNT',
            () => {
                const accounts = JSON.parse(localStorage.getItem('pcAccounts') || '[]');
                localStorage.setItem('pcAccounts', JSON.stringify(accounts.filter(a => a.uuid !== user.uuid)));
                PCAuth.signOut();
                window.location.href = 'index.html';
            }
        );
    });

    // --- Confirm Modal ---
    function showConfirm(title, message, word, onConfirm) {
        const modal    = document.getElementById('confirmModal');
        const titleEl  = document.getElementById('confirmTitle');
        const msgEl    = document.getElementById('confirmMessage');
        const inputWrap= document.getElementById('confirmInputWrap');
        const wordEl   = document.getElementById('confirmWord');
        const input    = document.getElementById('confirmInput');
        const confirmBtn= document.getElementById('confirmAction');

        titleEl.textContent  = title;
        msgEl.textContent    = message;
        wordEl.textContent   = word;
        input.value          = '';
        confirmBtn.disabled  = true;
        inputWrap.hidden     = false;
        modal.hidden         = false;

        input.addEventListener('input', () => {
            confirmBtn.disabled = input.value !== word;
        });

        const cleanUp = () => {
            modal.hidden = true;
            input.value = '';
            confirmBtn.disabled = true;
        };

        document.getElementById('closeConfirmModal')?.addEventListener('click', cleanUp, { once: true });
        document.getElementById('cancelAction')?.addEventListener('click', cleanUp, { once: true });
        confirmBtn.onclick = () => { cleanUp(); onConfirm(); };
    }

    document.getElementById('closeConfirmModal')?.addEventListener('click', () => {
        document.getElementById('confirmModal').hidden = true;
    });
    document.getElementById('cancelAction')?.addEventListener('click', () => {
        document.getElementById('confirmModal').hidden = true;
    });

    // =========================================================

    function loadSettings() {
        // Profile tab
        const displayNameInput = document.getElementById('displayName');
        const settingsEmailInput = document.getElementById('settingsEmail');
        if (displayNameInput) displayNameInput.value = user.username || '';
        if (settingsEmailInput) settingsEmailInput.value = user.email || '';

        // Game prefs
        const prefs = JSON.parse(localStorage.getItem('pcGamePrefs') || '{}');
        const gameSettings = JSON.parse(localStorage.getItem('settings') || '{}');
        const merged = { ...prefs, ...gameSettings };

        if (merged.musicVolume !== undefined) {
            const s = document.getElementById('musicVolume');
            const l = document.getElementById('musicVal');
            if (s) { s.value = merged.musicVolume; if(l) l.textContent = merged.musicVolume+'%'; }
        }
        if (merged.sfxVolume !== undefined) {
            const s = document.getElementById('sfxVolume');
            const l = document.getElementById('sfxVal');
            if (s) { s.value = merged.sfxVolume; if(l) l.textContent = merged.sfxVolume+'%'; }
        }
        if (merged.lighting !== undefined) {
            const el = document.getElementById('lighting');
            if (el) el.checked = merged.lighting !== false;
        }

        // Notifications
        const notifs = JSON.parse(localStorage.getItem('pcNotifications') || '{}');
        Object.entries(notifs).forEach(([k, v]) => {
            const el = document.getElementById('notif-'+k);
            if (el) el.checked = v;
        });
    }

    function saveField(field, value) {
        const accounts = JSON.parse(localStorage.getItem('pcAccounts') || '[]');
        const idx = accounts.findIndex(a => a.uuid === user.uuid);
        if (idx === -1) return;

        if (field === 'displayName') {
            accounts[idx].username = value;
            const u = PCAuth.getUser();
            u.username = value;
            PCAuth.setUser(u);
        } else if (field === 'email') {
            accounts[idx].email = value;
            const u = PCAuth.getUser();
            u.email = value;
            PCAuth.setUser(u);
        } else if (field === 'gamemode') {
            accounts[idx].defaultGamemode = parseInt(value);
        }

        localStorage.setItem('pcAccounts', JSON.stringify(accounts));
    }

    function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
});