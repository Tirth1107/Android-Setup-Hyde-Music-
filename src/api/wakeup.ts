const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'https://hydemusic.onrender.com';

/**
 * Pings the backend server to wake it up if it's sleeping (Render free tier).
 * Retries every 2 seconds for up to 60 seconds.
 */
export const wakeUpBackend = async (): Promise<boolean> => {
    const maxRetries = 30; // 30 * 2s = 60s max wait
    let retries = 0;

    const checkServer = async (): Promise<boolean> => {
        try {
            console.log(`[WakeUp] Pinging server attempt ${retries + 1}...`);
            // Simple GET request to root
            const response = await fetch(`${BACKEND_URL}/`, {
                method: 'GET',
                // short timeout logic isn't built-in to fetch, but Render usually responds or times out eventually.
                // We can add an AbortController if strict 5s timeout is needed, but for simplicity:
            });
            if (response.ok || response.status < 500) {
                console.log('[WakeUp] Server is awake!');
                return true;
            }
            return false;
        } catch (error) {
            console.warn('[WakeUp] Server not ready yet:', error);
            return false;
        }
    };

    // Initial check
    if (await checkServer()) return true;

    // Retry loop
    while (retries < maxRetries) {
        retries++;
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2s
        if (await checkServer()) return true;
    }

    console.error('[WakeUp] Failed to wake up server after multiple attempts.');
    return false;
};
