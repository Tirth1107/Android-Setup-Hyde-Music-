export interface Song {
  id: string;
  youtube_id?: string; // Added for backend compatibility
  title: string;
  artist: string;
  album: string;
  duration: number; // in seconds
  coverUrl: string;
  audioUrl?: string; // Optional because we stream via YT IFrame
}

export interface Playlist {
  id: string;
  name: string;
  coverUrl: string;
  songCount: number;
  songs?: Song[];
}

export interface PlayerState {
  currentSong: Song | null;
  isPlaying: boolean;
  progress: number; // 0-100
  currentTime: number; // in seconds
  duration: number; // in seconds
  volume: number; // 0-100
  isShuffled: boolean;
  repeatMode: 'off' | 'all' | 'one';
  queue: Song[];
}

export interface BackendTrack {
  id: string;
  youtube_id?: string;
  name?: string;
  artists?: string[] | string;
  album?: string;
  duration?: number;
  image?: string;
  thumbnail?: string;
}
