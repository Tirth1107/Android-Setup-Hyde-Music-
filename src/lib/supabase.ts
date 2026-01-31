import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 1. Define the Database structure for strong typing
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile>;
        Update: Partial<Profile>;
      };
      playlists: {
        Row: Playlist;
        Insert: Omit<Playlist, 'id' | 'created_at'>;
        Update: Partial<Playlist>;
      };
      playlist_tracks: {
        Row: PlaylistTrack;
        Insert: Omit<PlaylistTrack, 'id' | 'added_at'>;
        Update: Partial<PlaylistTrack>;
      };
      recently_played: {
        Row: RecentlyPlayed;
        Insert: Omit<RecentlyPlayed, 'id' | 'played_at'>;
        Update: Partial<RecentlyPlayed>;
      };
      now_playing: {
        Row: NowPlaying;
        Insert: Omit<NowPlaying, 'id' | 'updated_at'>;
        Update: Partial<NowPlaying>;
      };
    };
  };
};

// 2. Initialize client with the Database generic
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// --- Interface Definitions ---

// Fixed: Merged into a single Profile interface
export interface Profile {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  website?: string | null;
  email?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface Playlist {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  // Optional: Add cover_url if you plan to derive it later or add to schema
  cover_url?: string; 
}

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  youtube_id: string;
  title: string | null;
  artist: string | null;
  image: string | null;
  added_at: string;
}

export interface RecentlyPlayed {
  id: string;
  user_id: string;
  youtube_id: string;
  title: string | null;
  artist: string | null;
  image: string | null;
  played_at: string;
}

export interface NowPlaying {
  id: string;
  user_id: string;
  device_id: string;
  youtube_id: string;
  title: string | null;
  artist: string | null;
  image: string | null;
  position_seconds: number;
  is_playing: boolean;
  updated_at: string;
}

// Track type for the app (UI logic)
export interface Track {
  id: string;
  youtube_id: string;
  title: string;
  artist: string;
  image: string;
  duration?: number;
  album?: string;
}