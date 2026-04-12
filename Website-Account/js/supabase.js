// ============================================================
// PaperCraft Account — supabase.js
// Central Supabase client + PCAuth wrapper
// ============================================================

const SUPABASE_URL  = 'https://eextigqvyrmkwbrsnkvu.supabase.co';
const SUPABASE_ANON = 'sb_publishable_oBz4wL7jtMWTHdzHp95vBg_PS_LndzJ';

// Initialise Supabase (loaded via CDN before this script)
const _supa = supabase.createClient(SUPABASE_URL, SUPABASE_ANON);

// ============================================================
// PCAuth  — drop-in replacement for the old localStorage shim
// ============================================================
window.PCAuth = {

    // ── client access ─────────────────────────────────────
    client: _supa,

    // ── get current Supabase session user (sync cache) ────
    getUser() {
        // Returns the last cached session user; async version is getUserAsync()
        return this._cachedUser || null;
    },

    async getUserAsync() {
        const { data: { user } } = await _supa.auth.getUser();
        if (!user) { this._cachedUser = null; return null; }

        // Enrich with profile row
        const { data: profile } = await _supa
            .from('profiles')
            .select('username, email_verified, avatar_url, join_date')
            .eq('id', user.id)
            .single();

        this._cachedUser = {
            uuid:          user.id,
            email:         user.email,
            username:      profile?.username      || user.user_metadata?.username || 'Player',
            emailVerified: profile?.email_verified || false,
            avatarUrl:     profile?.avatar_url     || null,
            joinDate:      profile?.join_date       || user.created_at,
        };
        return this._cachedUser;
    },

    async isLoggedIn() {
        const { data: { session } } = await _supa.auth.getSession();
        return !!session;
    },

    async signOut() {
        this._cachedUser = null;
        await _supa.auth.signOut();
    },

    _cachedUser: null,
};

// ── Pre-warm cache on every page load ────────────────────
(async () => {
    await PCAuth.getUserAsync();
})();

// ── Keep cache fresh on auth state changes ────────────────
_supa.auth.onAuthStateChange(async (event, session) => {
    if (!session) {
        PCAuth._cachedUser = null;
    } else {
        await PCAuth.getUserAsync();
    }
});