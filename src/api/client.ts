import { Song, BackendTrack } from '@/types/music';

const API_URL = import.meta.env.VITE_BACKEND_URL || "https://hydemusic.onrender.com";
const API_KEY = import.meta.env.VITE_HYDE_API_KEY || "";

// ... (CURATED_PLAYLISTS and interface remain unchanged)

export async function apiFetch(path: string, options: RequestInit = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...(options.headers || {}),
        "X-HYDE-API-KEY": API_KEY,
    };

    // Ensure path starts with /
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // If API_URL already ends with / or cleanPath starts with /, handle carefully
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const url = `${baseUrl}${cleanPath}`;

    const res = await fetch(url, {
        ...options,
        headers: headers as HeadersInit
    });

    if (res.status === 401) {
        console.error("API Authorization Failed. Key:", API_KEY.substring(0, 5) + "...");
    }

    return res;
}

export const transformTrack = (raw: BackendTrack): Song => {
    if (!raw) throw new Error("Track data is null");

    // Ensure we have a valid ID
    const youtubeId = raw.youtube_id || raw.id.replace('youtube_', '');

    return {
        id: `yt_${youtubeId}`,
        youtube_id: youtubeId,
        title: raw.name || "Unknown Track",
        artist: Array.isArray(raw.artists) ? raw.artists.join(", ") : raw.artists || "Unknown Artist",
        album: raw.album || "Single",
        duration: Math.floor((raw.duration || 0) / 1000), // Convert ms to s
        coverUrl: raw.image || `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
        audioUrl: `https://www.youtube.com/watch?v=${youtubeId}` // Not used for streaming, just reference
    };
};

export const searchMusic = async (query: string): Promise<Song[]> => {
    try {
        const response = await apiFetch('/search_music', {
            method: 'POST',
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            // Fallback to GET
            const getResponse = await apiFetch(`/search?q=${encodeURIComponent(query)}`);
            if (!getResponse.ok) return [];
            const data = await getResponse.json();
            return Array.isArray(data) ? data.map(transformTrack) : [];
        }

        const data = await response.json();
        const rawTracks: BackendTrack[] = data.tracks || [];
        return rawTracks.map(transformTrack);
    } catch (e) {
        console.error("Search failed", e);
        return [];
    }
};

export const getSuggestions = async (query: string): Promise<string[]> => {
    try {
        const response = await apiFetch(`/suggestions?q=${encodeURIComponent(query)}`);
        if (!response.ok) return [];
        const data = await response.json();
        return Array.isArray(data) ? data : [];
    } catch {
        return [];
    }
};
