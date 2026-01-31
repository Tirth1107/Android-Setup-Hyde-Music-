// src/api/db.ts
import { supabase } from '@/lib/supabase';
import { Song, Playlist as AppPlaylist } from '@/types/music';
import { User } from '@supabase/supabase-js';

// --- Helper: Device ID Management ---
// Generates a persistent ID for this specific browser/device
const getDeviceId = () => {
    const STORAGE_KEY = 'music_device_id';
    let deviceId = localStorage.getItem(STORAGE_KEY);
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem(STORAGE_KEY, deviceId);
    }
    return deviceId;
};

// --- User Management ---
export const syncUser = async (user: User | null) => {
    if (!user) return;
    try {
        const { data, error: fetchError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .maybeSingle();

        if (fetchError) {
            console.error("SyncUser: Error checking profile:", fetchError);
            return;
        }

        if (!data) {
            const { error: insertError } = await supabase
                .from('profiles')
                .insert([{ id: user.id, email: user.email, username: user.email?.split('@')[0] || 'User' }]);

            if (insertError) {
                console.error("SyncUser: Error creating profile (check RLS!):", insertError);
            } else {
                console.log("SyncUser: Profile created for", user.id);
            }
        }
    } catch (err) {
        console.error("SyncUser: Unexpected error:", err);
    }
};

// --- Playlist Management ---
export const getLikedPlaylist = async (userId: string) => {
    // 1. Try to find existing by NAME
    const { data } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', userId)
        .eq('name', 'Liked Songs')
        .limit(1)
        .maybeSingle();

    if (data) return { ...data, type: 'system', tracks: [] };

    // 2. If not found, create it
    const { data: newData, error: createError } = await supabase
        .from('playlists')
        .insert({
            user_id: userId,
            name: 'Liked Songs'
        })
        .select()
        .single();

    if (createError) {
        console.error("Error creating liked playlist", createError);
        return null;
    }
    return { ...newData, type: 'system', tracks: [] };
};

export const isTrackLiked = async (userId: string, youtubeId: string): Promise<boolean> => {
    try {
        const liked = await getLikedPlaylist(userId);
        if (!liked) return false;

        const { data, error } = await supabase
            .from('playlist_tracks')
            .select('id')
            .eq('playlist_id', liked.id)
            .eq('youtube_id', youtubeId)
            .maybeSingle();

        return !!data;
    } catch (err) {
        return false;
    }
};

export const toggleLike = async (userId: string, song: Song): Promise<boolean> => {
    try {
        const liked = await getLikedPlaylist(userId);
        if (!liked) return false;

        const ytId = song.youtube_id || song.id.replace('yt_', '');
        const currentlyLiked = await isTrackLiked(userId, ytId);

        if (currentlyLiked) {
            return await removeTrackFromPlaylist(liked.id, song);
        } else {
            return await addTrackToPlaylist(liked.id, song);
        }
    } catch (err) {
        console.error("toggleLike: Unexpected error:", err);
        return false;
    }
};

export const getUserPlaylists = async (userId: string): Promise<AppPlaylist[]> => {
    if (!userId) return [];

    try {
        // 1. Ensure Liked Playlist exists (in background, don't block everything if this fails)
        getLikedPlaylist(userId).catch(err => console.error("getUserPlaylists: Background getLikedPlaylist failed:", err));

        // 2. Get ALL Playlists
        const { data: playlists, error } = await supabase
            .from('playlists')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('getUserPlaylists: Error fetching playlists:', error);
            return [];
        }

        if (!playlists || playlists.length === 0) return [];

        // Filter out "Liked Songs" so it doesn't show in the general library
        const filteredPlaylists = playlists.filter(pl => pl.name !== 'Liked Songs');

        // 3. Get Tracks for each playlist
        const playlistsWithTracks = await Promise.all(filteredPlaylists.map(async (pl) => {
            try {
                const { data: tracksData, error: tracksError } = await supabase
                    .from('playlist_tracks')
                    .select('*')
                    .eq('playlist_id', pl.id)
                    .order('added_at', { ascending: true });

                if (tracksError) {
                    console.error(`getUserPlaylists: Error fetching tracks for ${pl.id}:`, tracksError);
                    return { id: pl.id, name: pl.name, coverUrl: "", songCount: 0, songs: [] };
                }

                const songs: Song[] = tracksData?.map(t => ({
                    id: t.youtube_id,
                    youtube_id: t.youtube_id,
                    title: t.title || "Unknown",
                    artist: t.artist || "Unknown",
                    album: "Unknown",
                    duration: 0,
                    coverUrl: t.image || ""
                })) || [];

                return {
                    id: pl.id,
                    name: pl.name,
                    coverUrl: songs.length > 0 ? songs[0].coverUrl : "",
                    songCount: songs.length,
                    songs: songs
                };
            } catch (err) {
                console.error(`getUserPlaylists: Unexpected error for playlist ${pl.id}:`, err);
                return { id: pl.id, name: pl.name, coverUrl: "", songCount: 0, songs: [] };
            }
        }));

        return playlistsWithTracks;
    } catch (err) {
        console.error("getUserPlaylists: Unexpected error:", err);
        return [];
    }
};

export const getPlaylist = async (userId: string, playlistId: string): Promise<AppPlaylist | null> => {
    if (!userId || !playlistId) return null;

    try {
        // Handle "liked" virtual ID
        let targetId = playlistId;
        if (playlistId === 'liked') {
            const liked = await getLikedPlaylist(userId);
            if (!liked) return null;
            targetId = liked.id;
        }

        const { data: pl, error: plError } = await supabase
            .from('playlists')
            .select('*')
            .eq('id', targetId)
            .single();

        if (plError || !pl) return null;

        const { data: tracksData, error: tracksError } = await supabase
            .from('playlist_tracks')
            .select('*')
            .eq('playlist_id', targetId)
            .order('added_at', { ascending: true });

        const songs: Song[] = tracksData?.map(t => ({
            id: t.youtube_id,
            youtube_id: t.youtube_id,
            title: t.title || "Unknown",
            artist: t.artist || "Unknown",
            album: "Unknown",
            duration: 0,
            coverUrl: t.image || ""
        })) || [];

        return {
            id: pl.id,
            name: pl.name,
            coverUrl: songs.length > 0 ? songs[0].coverUrl : "",
            songCount: songs.length,
            songs: songs
        };
    } catch (err) {
        console.error("Error in getPlaylist:", err);
        return null;
    }
};

export const createPlaylist = async (userId: string, name: string): Promise<AppPlaylist | null> => {
    try {
        const { data, error } = await supabase
            .from('playlists')
            .insert({
                user_id: userId,
                name: name
            })
            .select()
            .single();

        if (error || !data) {
            console.error("createPlaylist: Error (check RLS!):", error);
            return null;
        }

        return {
            id: data.id,
            name: data.name,
            coverUrl: "",
            songCount: 0,
            songs: []
        };
    } catch (err) {
        console.error("createPlaylist: Unexpected error:", err);
        return null;
    }
};

export const updatePlaylist = async (playlistId: string, updates: Partial<AppPlaylist>): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from('playlists')
            .update(updates)
            .eq('id', playlistId);

        if (error) {
            console.error("updatePlaylist: Error:", error);
            return false;
        }
        return true;
    } catch (err) {
        console.error("updatePlaylist: Unexpected error:", err);
        return false;
    }
};

export const deletePlaylist = async (playlistId: string): Promise<boolean> => {
    try {
        // Delete tracks first to respect FK
        const { error: trackError } = await supabase.from('playlist_tracks').delete().eq('playlist_id', playlistId);
        if (trackError) console.warn("deletePlaylist: Error deleting tracks:", trackError);

        const { error: plError } = await supabase
            .from('playlists')
            .delete()
            .eq('id', playlistId);

        if (plError) {
            console.error("deletePlaylist: Error:", plError);
            return false;
        }
        return true;
    } catch (err) {
        console.error("deletePlaylist: Unexpected error:", err);
        return false;
    }
};

export const addTrackToPlaylist = async (playlistId: string, song: Song) => {
    try {
        const ytId = song.youtube_id || song.id.replace('yt_', '');

        const { error } = await supabase
            .from('playlist_tracks')
            .insert({
                playlist_id: playlistId,
                youtube_id: ytId,
                title: song.title,
                artist: song.artist,
                image: song.coverUrl
            });

        if (error) {
            // Ignore duplicate key errors (23505) but log others
            if (error.code !== '23505') {
                console.error('addTrackToPlaylist: Error:', error);
            }
            return false;
        }
        return true;
    } catch (err) {
        console.error("addTrackToPlaylist: Unexpected error:", err);
        return false;
    }
};

export const removeTrackFromPlaylist = async (playlistId: string, song: Song) => {
    try {
        const ytId = song.youtube_id || song.id.replace('yt_', '');
        const { error } = await supabase
            .from('playlist_tracks')
            .delete()
            .eq('playlist_id', playlistId)
            .eq('youtube_id', ytId);

        if (error) {
            console.error('removeTrackFromPlaylist: Error:', error);
            return false;
        }
        return true;
    } catch (err) {
        console.error("removeTrackFromPlaylist: Unexpected error:", err);
        return false;
    }
};

// --- Recently Played ---
export const addToHistory = async (userId: string, song: Song) => {
    if (!userId || !song) return;
    try {
        const ytId = song.youtube_id || song.id.replace('yt_', '');

        // 1. Delete existing entry for this song to "bump" it to top
        await supabase
            .from('recently_played')
            .delete()
            .eq('user_id', userId)
            .eq('youtube_id', ytId);

        // 2. Insert new entry
        const { error } = await supabase
            .from('recently_played')
            .insert({
                user_id: userId,
                youtube_id: ytId,
                title: song.title,
                artist: song.artist,
                image: song.coverUrl
            });

        if (error) console.error('addToHistory: Error:', error);
    } catch (err) {
        console.error("addToHistory: Unexpected error:", err);
    }
};

// --- Now Playing (Fixed) ---
export const updateNowPlaying = async (
    userId: string,
    song: Song,
    isPlaying: boolean,
    position: number
) => {
    if (!userId || !song) return;
    try {
        const ytId = song.youtube_id || song.id.replace('yt_', '');
        const deviceId = getDeviceId();

        // 1. Clean up old state for this user
        await supabase.from('now_playing').delete().eq('user_id', userId);

        // 2. Insert new state
        const { error } = await supabase
            .from('now_playing')
            .insert({
                user_id: userId,
                device_id: deviceId,
                youtube_id: ytId,
                title: song.title,
                artist: song.artist,
                image: song.coverUrl,
                position_seconds: Math.floor(position),
                is_playing: isPlaying,
                updated_at: new Date().toISOString()
            });

        if (error) console.error("updateNowPlaying: Error:", error);
    } catch (err) {
        console.error("updateNowPlaying: Unexpected error:", err);
    }
};

export const getNowPlaying = async (userId: string): Promise<{
    song: Song,
    position: number,
    isPlaying: boolean
} | null> => {
    if (!userId) return null;

    try {
        const { data, error } = await supabase
            .from('now_playing')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error("getNowPlaying: Error:", error);
            return null;
        }
        if (!data) return null;

        const song: Song = {
            id: `yt_${data.youtube_id}`,
            youtube_id: data.youtube_id,
            title: data.title || "Unknown",
            artist: data.artist || "Unknown",
            coverUrl: data.image || "",
            album: "",
            duration: 0
        };

        return {
            song,
            position: data.position_seconds || 0,
            isPlaying: data.is_playing || false
        };
    } catch (err) {
        console.error("getNowPlaying: Unexpected error:", err);
        return null;
    }
};

export const getRecentlyPlayed = async (userId: string, limit: number = 20): Promise<Song[]> => {
    if (!userId) return [];

    try {
        const { data, error } = await supabase
            .from('recently_played')
            .select('*')
            .eq('user_id', userId)
            .order('played_at', { ascending: false })
            .limit(limit * 2);

        if (error) {
            console.error("getRecentlyPlayed: Error:", error);
            return [];
        }

        // Filter duplicates by youtube_id
        const uniqueTracks = new Map();
        data.forEach((t: any) => {
            if (!uniqueTracks.has(t.youtube_id) && uniqueTracks.size < limit) {
                uniqueTracks.set(t.youtube_id, t);
            }
        });

        return Array.from(uniqueTracks.values()).map((t: any) => ({
            id: `yt_${t.youtube_id}`,
            youtube_id: t.youtube_id,
            title: t.title || "Unknown",
            artist: t.artist || "Unknown",
            album: "Unknown",
            duration: 0,
            coverUrl: t.image || ""
        }));
    } catch (err) {
        console.error("getRecentlyPlayed: Unexpected error:", err);
        return [];
    }
};