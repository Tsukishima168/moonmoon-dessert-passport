import liff from '@line/liff';
import { supabase } from './supabase';

const LIFF_ID = import.meta.env.VITE_LIFF_ID;

export async function initLiffAndAuth() {
    if (!LIFF_ID) {
        console.warn('[LIFF] VITE_LIFF_ID is not set. Skipping LIFF init.');
        return;
    }

    try {
        await liff.init({ liffId: LIFF_ID });
        console.log('[LIFF] initialized.');

        if (liff.isLoggedIn()) {
            const profile = await liff.getProfile();
            console.log('[LIFF] User Profile:', profile);

            if (supabase) {
                // Check if there is a Supabase session
                const { data: { session } } = await supabase.auth.getSession();

                if (session?.user) {
                    // Bind LINE userId to Supabase user via raw_user_meta_data
                    await supabase.auth.updateUser({
                        data: {
                            line_user_id: profile.userId,
                            line_display_name: profile.displayName,
                            line_picture_url: profile.pictureUrl
                        }
                    });

                    // Also upsert into passport_users if needed
                    await supabase.from('passport_users').upsert({
                        id: session.user.id,
                        line_user_id: profile.userId,
                        display_name: profile.displayName,
                        profile_picture_url: profile.pictureUrl,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                    console.log('[LIFF] Successfully bound LINE profile to Supabase user.');
                } else {
                    console.log('[LIFF] Supabase user not logged in yet. Cannot bind.');
                }
            }
        }
    } catch (err) {
        console.error('[LIFF] initialization failed', err);
    }
}
