// ============================================================
// PaperCraft Game Client — supabase.js
// ============================================================

// TODO: Replace with your actual Supabase credentials
const SUPABASE_URL = 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';

// Initialize Supabase client
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// PCAuth wrapper for consistent API across Account Portal and Game
window.PCAuth = {
    client: supabaseClient,

    // Get current session user synchronously (cached)
    getUser() {
        const session = this.client.auth.getSession();
        if (!session?.data?.session?.user) return null;
        
        const user = session.data.session.user;
        return {
            uuid: user.id,
            email: user.email,
            emailVerified: !!user.email_confirmed_at,
            username: user.user_metadata?.username || 'Player',
            joinDate: user.created_at
        };
    },

    // Get current session user asynchronously (fresh fetch)
    async getUserAsync() {
        const { data: { session } } = await this.client.auth.getSession();
        if (!session?.user) return null;

        const user = session.user;
        return {
            uuid: user.id,
            email: user.email,
            emailVerified: !!user.email_confirmed_at,
            username: user.user_metadata?.username || 'Player',
            joinDate: user.created_at
        };
    },

    // Sign out
    async signOut() {
        await this.client.auth.signOut();
    },

    // Get player skin from Supabase Storage
    async getPlayerSkin(userId) {
        try {
            const { data, error } = await this.client.storage
                .from('skins')
                .download(`${userId}/skin.png`);
            
            if (error) return null;
            
            // Convert blob to base64 data URL
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.onerror = reject;
                reader.readAsDataURL(data);
            });
        } catch (err) {
            console.error('Error loading skin:', err);
            return null;
        }
    }
};