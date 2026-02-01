import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
  Volume2, VolumeX, Maximize2, Minimize2, ChevronDown, Heart,
  ListMusic, BarChart3, TrendingUp, Music, Brain, Settings
} from 'lucide-react';
import { Song, PlayerState } from '../types/music';
import { addToHistory, updateNowPlaying, getNowPlaying } from '@/api/db';
import { searchMusic } from '@/api/client';
import { useAuth } from './useAuth';
import TrackActionMenu from '../components/TrackActionMenu';

// ============================================================================
// MUSIC RECOMMENDATION INTELLIGENCE ENGINE
// ============================================================================

interface ListeningEvent {
  songId: string;
  artist: string;
  genre?: string;
  action: 'play' | 'skip' | 'replay' | 'like' | 'full_listen';
  timestamp: number;
  listenDuration?: number;
  songDuration?: number;
}

interface UserTasteProfile {
  artistPreferences: Map<string, number>;
  genrePreferences: Map<string, number>;
  moodPreferences: Map<string, number>;
  recentlyPlayed: Set<string>;
  recentlySkipped: Set<string>;
  favoriteArtists: string[];
  discoveryOpenness: number;
  lastUpdated: number;
}

interface SessionContext {
  currentSong: Song;
  queue: Song[];
  recentQueue: Song[];
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  skipCount: number;
  repeatCount: number;
  isShuffled: boolean;
  sessionMood?: 'energetic' | 'chill' | 'focus' | 'melancholic' | 'upbeat';
}

interface ScoredCandidate {
  song: Song;
  score: number;
  reasons: {
    artistSimilarity: number;
    genreSimilarity: number;
    moodCompatibility: number;
    noveltyBonus: number;
    repetitionPenalty: number;
    popularitySignal: number;
  };
}

class MusicRecommendationEngine {
  private userProfile: UserTasteProfile;
  private listeningHistory: ListeningEvent[] = [];
  private readonly HISTORY_WINDOW = 50;
  private readonly RECENT_PLAYED_WINDOW = 20;

  constructor() {
    this.userProfile = this.initializeProfile();
  }

  private initializeProfile(): UserTasteProfile {
    return {
      artistPreferences: new Map(),
      genrePreferences: new Map(),
      moodPreferences: new Map(),
      recentlyPlayed: new Set(),
      recentlySkipped: new Set(),
      favoriteArtists: [],
      discoveryOpenness: 0.3,
      lastUpdated: Date.now(),
    };
  }

  public recordListeningEvent(event: ListeningEvent): void {
    this.listeningHistory.push(event);

    if (this.listeningHistory.length > this.HISTORY_WINDOW) {
      this.listeningHistory.shift();
    }

    this.updateTasteProfile(event);
  }

  private updateTasteProfile(event: ListeningEvent): void {
    const { artist, genre, action, listenDuration, songDuration } = event;

    const completionRatio = listenDuration && songDuration
      ? listenDuration / songDuration
      : 1;

    const currentArtistScore = this.userProfile.artistPreferences.get(artist) || 0;

    switch (action) {
      case 'full_listen':
        this.userProfile.artistPreferences.set(artist, currentArtistScore + 3);
        break;
      case 'like':
        this.userProfile.artistPreferences.set(artist, currentArtistScore + 5);
        break;
      case 'replay':
        this.userProfile.artistPreferences.set(artist, currentArtistScore + 4);
        break;
      case 'skip':
        const penalty = completionRatio < 0.3 ? -2 : -0.5;
        this.userProfile.artistPreferences.set(artist, Math.max(0, currentArtistScore + penalty));
        this.userProfile.recentlySkipped.add(event.songId);
        break;
      case 'play':
        const credit = completionRatio * 1.5;
        this.userProfile.artistPreferences.set(artist, currentArtistScore + credit);
        break;
    }

    if (genre) {
      const currentGenreScore = this.userProfile.genrePreferences.get(genre) || 0;
      const genreBoost = action === 'skip' ? -1 : completionRatio * 2;
      this.userProfile.genrePreferences.set(genre, Math.max(0, currentGenreScore + genreBoost));
    }

    this.userProfile.recentlyPlayed.add(event.songId);
    if (this.userProfile.recentlyPlayed.size > this.RECENT_PLAYED_WINDOW) {
      const oldest = Array.from(this.userProfile.recentlyPlayed)[0];
      this.userProfile.recentlyPlayed.delete(oldest);
    }

    this.userProfile.favoriteArtists = Array.from(this.userProfile.artistPreferences.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([artist]) => artist);

    const recentSkips = this.listeningHistory
      .slice(-10)
      .filter(e => e.action === 'skip').length;

    if (recentSkips > 5) {
      this.userProfile.discoveryOpenness = Math.max(0.1, this.userProfile.discoveryOpenness - 0.05);
    } else if (recentSkips < 2) {
      this.userProfile.discoveryOpenness = Math.min(0.5, this.userProfile.discoveryOpenness + 0.05);
    }

    this.userProfile.lastUpdated = Date.now();
  }

  private scoreSong(candidate: Song, context: SessionContext): ScoredCandidate {
    const reasons = {
      artistSimilarity: this.calculateArtistSimilarity(candidate, context),
      genreSimilarity: this.calculateGenreSimilarity(candidate, context),
      moodCompatibility: this.calculateMoodCompatibility(candidate, context),
      noveltyBonus: this.calculateNoveltyBonus(candidate),
      repetitionPenalty: this.calculateRepetitionPenalty(candidate, context),
      popularitySignal: this.calculatePopularitySignal(candidate),
    };

    const score =
      reasons.artistSimilarity * 0.30 +
      reasons.genreSimilarity * 0.20 +
      reasons.moodCompatibility * 0.25 +
      reasons.noveltyBonus * 0.10 +
      reasons.repetitionPenalty * 0.10 +
      reasons.popularitySignal * 0.05;

    return { song: candidate, score, reasons };
  }

  private calculateArtistSimilarity(candidate: Song, context: SessionContext): number {
    const candidateArtist = candidate.artist;
    const currentArtist = context.currentSong.artist;

    if (candidateArtist === currentArtist) {
      return 80;
    }

    const artistScore = this.userProfile.artistPreferences.get(candidateArtist) || 0;

    if (this.userProfile.favoriteArtists.includes(candidateArtist)) {
      return 90 + artistScore;
    }

    const maxScore = Math.max(...Array.from(this.userProfile.artistPreferences.values()), 1);
    return (artistScore / maxScore) * 70;
  }

  private calculateGenreSimilarity(candidate: Song, context: SessionContext): number {
    if (!candidate.genre) return 50;

    const genreScore = this.userProfile.genrePreferences.get(candidate.genre) || 0;
    const maxScore = Math.max(...Array.from(this.userProfile.genrePreferences.values()), 1);

    return (genreScore / maxScore) * 100;
  }

  private calculateMoodCompatibility(candidate: Song, context: SessionContext): number {
    if (context.skipCount > 3) {
      return this.userProfile.favoriteArtists.includes(candidate.artist) ? 90 : 40;
    }

    if (context.repeatCount > 0) {
      return candidate.artist === context.currentSong.artist ? 95 : 60;
    }

    return 70;
  }

  private calculateNoveltyBonus(candidate: Song): number {
    const artistScore = this.userProfile.artistPreferences.get(candidate.artist) || 0;

    if (artistScore === 0) {
      return this.userProfile.discoveryOpenness * 100;
    }

    if (artistScore < 3) {
      return this.userProfile.discoveryOpenness * 50;
    }

    return 10;
  }

  private calculateRepetitionPenalty(candidate: Song, context: SessionContext): number {
    if (this.userProfile.recentlyPlayed.has(candidate.id)) {
      return -80;
    }

    if (this.userProfile.recentlySkipped.has(candidate.id)) {
      return -100;
    }

    const recentArtists = context.recentQueue.slice(-3).map(s => s.artist);
    if (recentArtists.includes(candidate.artist)) {
      return -40;
    }

    return 0;
  }

  private calculatePopularitySignal(candidate: Song): number {
    const views = candidate.views || 0;

    if (views > 10000000) return 20;
    if (views > 1000000) return 15;
    if (views > 100000) return 10;
    return 5;
  }

  public recommendNextSongs(
    candidates: Song[],
    context: SessionContext,
    count: number = 3
  ): Song[] {
    const scored = candidates.map(c => this.scoreSong(c, context));
    scored.sort((a, b) => b.score - a.score);

    const familiar = scored.filter(s =>
      this.userProfile.favoriteArtists.includes(s.song.artist) ||
      (this.userProfile.artistPreferences.get(s.song.artist) || 0) > 3
    );

    const discovery = scored.filter(s =>
      !this.userProfile.favoriteArtists.includes(s.song.artist) &&
      (this.userProfile.artistPreferences.get(s.song.artist) || 0) <= 3
    );

    const results: Song[] = [];
    const targetFamiliar = Math.ceil(count * (1 - this.userProfile.discoveryOpenness));
    const targetDiscovery = count - targetFamiliar;

    for (let i = 0; i < targetFamiliar && i < familiar.length; i++) {
      results.push(familiar[i].song);
    }

    for (let i = 0; i < targetDiscovery && i < discovery.length; i++) {
      results.push(discovery[i].song);
    }

    if (results.length < count) {
      const remaining = scored
        .filter(s => !results.includes(s.song))
        .slice(0, count - results.length)
        .map(s => s.song);
      results.push(...remaining);
    }

    console.log(`🎵 Recommended ${results.length} songs:`, {
      familiar: targetFamiliar,
      discovery: targetDiscovery,
      discoveryOpenness: this.userProfile.discoveryOpenness
    });

    return results;
  }

  public getRecommendationStrategy(): string {
    const skipRate = this.listeningHistory.slice(-10)
      .filter(e => e.action === 'skip').length / 10;

    if (skipRate > 0.5) {
      return 'focus_mode';
    } else if (this.userProfile.discoveryOpenness > 0.4) {
      return 'discovery_mode';
    } else {
      return 'balanced';
    }
  }

  public getUserProfile(): UserTasteProfile {
    return { ...this.userProfile };
  }

  public resetProfile(): void {
    this.userProfile = this.initializeProfile();
    this.listeningHistory = [];
  }

  public exportProfile(): string {
    return JSON.stringify({
      profile: {
        artistPreferences: Array.from(this.userProfile.artistPreferences.entries()),
        genrePreferences: Array.from(this.userProfile.genrePreferences.entries()),
        favoriteArtists: this.userProfile.favoriteArtists,
        discoveryOpenness: this.userProfile.discoveryOpenness,
      },
      history: this.listeningHistory.slice(-20),
    }, null, 2);
  }

  public importProfile(data: string): void {
    try {
      const parsed = JSON.parse(data);
      this.userProfile.artistPreferences = new Map(parsed.profile.artistPreferences);
      this.userProfile.genrePreferences = new Map(parsed.profile.genrePreferences);
      this.userProfile.favoriteArtists = parsed.profile.favoriteArtists;
      this.userProfile.discoveryOpenness = parsed.profile.discoveryOpenness;
    } catch (error) {
      console.error('Failed to import profile:', error);
    }
  }
}

// ============================================================================
// PLAYER CONTEXT & PROVIDER
// ============================================================================

interface PlayerContextType extends PlayerState {
  playSong: (song: Song) => void;
  pauseSong: () => void;
  togglePlay: () => void;
  nextSong: () => void;
  prevSong: () => void;
  seekTo: (progress: number) => void;
  setVolume: (volume: number) => void;
  toggleShuffle: () => void;
  toggleRepeat: () => void;
  addToQueue: (song: Song) => void;
  clearQueue: () => void;
  playTrackList: (tracks: Song[], startIndex?: number) => void;
  exportUserProfile: () => string;
  resetRecommendations: () => void;
  skipCount: number;
  repeatCount: number;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const isTitleTooSimilar = (currentTitle: string, newTitle: string) => {
  const clean1 = currentTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  const clean2 = newTitle.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean1.includes(clean2) || clean2.includes(clean1);
};

// Desktop Full Screen Player Component
const DesktopFullScreenPlayer = ({
  currentTrack, isPlaying, progress, duration, volume, isShuffled, repeatMode,
  onClose, onTogglePlay, onNext, onPrev, onSeek, onVolumeChange, onToggleShuffle, onToggleRepeat
}: any) => {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: "spring", bounce: 0, duration: 0.5 }}
      className="hidden md:flex fixed inset-0 z-[200] flex-col overflow-hidden bg-zinc-950"
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <img
          src={currentTrack.coverUrl || currentTrack.image}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[100px] scale-110"
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
      </div>

      <div className="w-full px-8 py-6 flex justify-between items-center z-10">
        <div className="flex items-center space-x-3 bg-white/5 border border-white/5 px-4 py-1.5 rounded-full backdrop-blur-md">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-white/80">Now Playing</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-white backdrop-blur-md transition-all hover:scale-105 hover:rotate-90"
        >
          <Minimize2 className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 flex w-full max-w-5xl mx-auto px-8 pb-12 items-center justify-center space-x-16">
        <motion.div
          layoutId="desktop-cover"
          className="w-[320px] h-[320px] shadow-2xl rounded-2xl overflow-hidden flex-shrink-0 relative group border border-white/10"
        >
          <img src={currentTrack.coverUrl || currentTrack.image} className="w-full h-full object-cover" alt="Cover" />
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        </motion.div>

        <div className="flex-1 flex flex-col justify-center space-y-8 max-w-xl">
          <div className="flex justify-between items-start">
            <div className="space-y-2 pr-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight line-clamp-2">
                {currentTrack.title}
              </h1>
              <h2 className="text-2xl text-white/60 font-medium tracking-wide">
                {currentTrack.artist}
              </h2>
            </div>
            <div className="mt-2 shrink-0">
              <TrackActionMenu song={currentTrack} direction="down" />
            </div>
          </div>

          <div className="w-full space-y-2 group">
            <div className="relative h-1.5 bg-white/10 rounded-full cursor-pointer overflow-hidden hover:h-2.5 transition-all duration-300">
              <div
                className="absolute left-0 top-0 bottom-0 bg-white rounded-full group-hover:bg-emerald-400 transition-colors"
                style={{ width: `${(progress / (duration || 1)) * 100}%` }}
              />
              <input
                type="range"
                min="0"
                max={duration || 100}
                value={progress}
                onChange={onSeek}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-white/40 font-mono">
              <span>{formatTime(progress)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button onClick={onToggleShuffle} className={`p-2 transition-all hover:scale-110 ${isShuffled ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}>
              <Shuffle className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-6">
              <button onClick={onPrev} className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all active:scale-95 hover:scale-105">
                <SkipBack className="w-6 h-6 fill-white text-white" />
              </button>
              <button
                onClick={onTogglePlay}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-lg hover:scale-105 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-7 h-7 fill-current" /> : <Play className="w-7 h-7 fill-current ml-1" />}
              </button>
              <button onClick={onNext} className="p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/5 transition-all active:scale-95 hover:scale-105">
                <SkipForward className="w-6 h-6 fill-white text-white" />
              </button>
            </div>

            <button onClick={onToggleRepeat} className={`p-2 transition-all hover:scale-110 ${repeatMode !== 'off' ? 'text-emerald-400' : 'text-white/40 hover:text-white'}`}>
              <Repeat className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3 bg-white/5 px-4 py-3 rounded-xl border border-white/5 w-fit mx-auto backdrop-blur-md">
            <Volume2 className="w-4 h-4 text-white/50" />
            <div className="relative w-24 h-1 bg-white/10 rounded-full overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 bg-white" style={{ width: `${volume}%` }} />
              <input
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={onVolumeChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Main Provider Component
export const PlayerProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [state, setState] = useState<PlayerState>({
    currentSong: null,
    isPlaying: false,
    progress: 0,
    currentTime: 0,
    duration: 0,
    volume: 75,
    isShuffled: false,
    repeatMode: 'off',
    queue: [],
  });

  const [skipCount, setSkipCount] = useState(0);
  const [repeatCount, setRepeatCount] = useState(0);

  const playerRef = useRef<any>(null);
  const playerReady = useRef(false);
  const isFetchingQueue = useRef(false);
  const recommendationEngine = useRef(new MusicRecommendationEngine());

  const getVideoId = (song: Song) => song.youtube_id || song.id.replace('yt_', '');

  const getTimeOfDay = (): SessionContext['timeOfDay'] => {
    const hour = new Date().getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    if (hour < 21) return 'evening';
    return 'night';
  };

  // Initial Fetch
  useEffect(() => {
    if (!user) return;
    const fetchLastState = async () => {
      try {
        const lastState = await getNowPlaying(user.id);
        if (lastState && lastState.song) {
          setState(prev => ({
            ...prev,
            currentSong: lastState.song,
            currentTime: lastState.position,
            isPlaying: false,
            progress: (lastState.position / (lastState.song.duration || 1)) * 100
          }));
        }
      } catch (error) {
        console.error("Failed to fetch last state", error);
      }
    };
    fetchLastState();
  }, [user]);

  // Track completion events
  useEffect(() => {
    if (!state.isPlaying && state.currentSong && state.currentTime > 0) {
      const completionRatio = state.currentTime / (state.duration || 1);

      if (completionRatio > 0.9) {
        recommendationEngine.current.recordListeningEvent({
          songId: state.currentSong.id,
          artist: state.currentSong.artist,
          genre: (state.currentSong as any).genre,
          action: 'full_listen',
          timestamp: Date.now(),
          listenDuration: state.currentTime,
          songDuration: state.duration,
        });
      }
    }
  }, [state.isPlaying, state.currentSong, state.currentTime, state.duration]);

  // INTELLIGENT AUTO-QUEUE LOGIC
  useEffect(() => {
    const handleIntelligentAutoQueue = async () => {
      const { currentSong, queue, isShuffled } = state;
      if (!currentSong || isFetchingQueue.current) return;

      const currentIndex = queue.findIndex(s => s.id === currentSong.id);
      const needsMoreSongs = queue.length === 0 || currentIndex >= queue.length - 2;

      if (needsMoreSongs) {
        isFetchingQueue.current = true;
        try {
          console.log("🎵 Intelligent Auto-Queue: Analyzing listening patterns...");

          const recentHistory = queue.slice(-10);

          const sessionContext: SessionContext = {
            currentSong,
            queue,
            recentQueue: recentHistory,
            timeOfDay: getTimeOfDay(),
            skipCount,
            repeatCount,
            isShuffled,
          };

          const strategy = recommendationEngine.current.getRecommendationStrategy();
          console.log(`📊 Strategy: ${strategy}`);

          const searchQuery = strategy === 'focus_mode'
            ? `${currentSong.artist} best songs`
            : strategy === 'discovery_mode'
              ? `similar to ${currentSong.artist} new artists`
              : `${currentSong.artist} radio`;

          let candidates = await searchMusic(searchQuery);

          candidates = candidates.filter(c =>
            !queue.some(q => q.id === c.id) &&
            c.id !== currentSong.id &&
            !isTitleTooSimilar(currentSong.title, c.title)
          );

          const recommendations = recommendationEngine.current.recommendNextSongs(
            candidates,
            sessionContext,
            5
          );

          if (recommendations.length > 0) {
            console.log(`✅ Added ${recommendations.length} intelligent recommendations`);
            setState(prev => ({
              ...prev,
              queue: [...prev.queue, ...recommendations]
            }));
          } else {
            console.log("⚠️ No recommendations found, using fallback");
            const fallback = candidates.slice(0, 3);
            setState(prev => ({
              ...prev,
              queue: [...prev.queue, ...fallback]
            }));
          }

        } catch (error) {
          console.error("Auto-Queue Error:", error);
        } finally {
          isFetchingQueue.current = false;
        }
      }
    };

    handleIntelligentAutoQueue();
  }, [state.currentSong, state.queue, skipCount, repeatCount]);

  // --- MOBILE BACKGROUND PLAYBACK HACK ---
  // A silent audio track is played alongside the YouTube video.
  // This "tricks" iOS/Android into thinking a real music track is playing,
  // preventing them from suspending the YouTube IFrame when backgrounded.
  const silentAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // 1-second silent MP3
    const SILENT_MP3 = 'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//OEAAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAEAAABIADAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDV1dXV1dXV1dXV1dXV1dXV1dXV1dXV1dXV6urq6urq6urq6urq6urq6urq6urq6urq6v////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAASAAAAAA//OEMAAAAAAA';

    if (!silentAudioRef.current) {
      const audio = new Audio(SILENT_MP3);
      audio.loop = true;
      audio.volume = 0; // Silent
      audio.preload = 'auto';
      silentAudioRef.current = audio;
    }
  }, []);

  // Sync Silent Audio with Player State
  useEffect(() => {
    const audio = silentAudioRef.current;
    if (!audio) return;

    if (state.isPlaying) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Auto-play policy might block this until user interaction.
          // Usually handled by the main play button click, but good to catch.
          console.warn("Silent audio play blocked:", error);
        });
      }
    } else {
      audio.pause();
    }
  }, [state.isPlaying]);

  // YouTube API
  useEffect(() => {
    if (!document.getElementById('youtube-player-hidden')) {
      const playerDiv = document.createElement('div');
      playerDiv.id = 'youtube-player-hidden';
      // Use opacity 0 instead of visibility: hidden to potentially avoid some background execution restrictions
      playerDiv.style.cssText = 'position: absolute; top: -9999px; left: -9999px; opacity: 0; pointer-events: none; z-index: -1;';
      document.body.appendChild(playerDiv);
    }

    const initPlayer = () => {
      if (playerRef.current) return;
      playerRef.current = new window.YT.Player('youtube-player-hidden', {
        height: '0',
        width: '0',
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          playsinline: 1,
          rel: 0,
          origin: window.location.origin
        },
        events: {
          onReady: (event: any) => {
            playerReady.current = true;
            event.target.setVolume(state.volume);
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setState(prev => ({ ...prev, isPlaying: true }));
            } else if (event.data === window.YT.PlayerState.PAUSED) {
              setState(prev => ({ ...prev, isPlaying: false }));
            } else if (event.data === window.YT.PlayerState.ENDED) {
              setState(prev => ({ ...prev, isPlaying: false }));
              nextSong();
            }
          },
          onError: (e: any) => console.error("YT Error:", e)
        }
      });
    };

    if (!window.YT) {
      if (!document.getElementById('youtube-api-script')) {
        const tag = document.createElement('script');
        tag.id = 'youtube-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        window.onYouTubeIframeAPIReady = initPlayer;
      } else {
        window.onYouTubeIframeAPIReady = initPlayer;
      }
    } else {
      initPlayer();
    }
  }, []);

  useEffect(() => {
    if (playerRef.current && playerReady.current) {
      playerRef.current.setVolume(state.volume);
    }
  }, [state.volume]);

  // Actions
  const playSong = useCallback((song: Song) => {
    const videoId = getVideoId(song);
    if (playerRef.current && playerReady.current) {
      if (state.currentSong?.id === song.id) playerRef.current.playVideo();
      else playerRef.current.loadVideoById(videoId);
    }

    recommendationEngine.current.recordListeningEvent({
      songId: song.id,
      artist: song.artist,
      genre: (song as any).genre,
      action: 'play',
      timestamp: Date.now(),
    });

    if (user) {
      addToHistory(user.id, song);
      updateNowPlaying(user.id, song, true, 0);
    }
    setState(prev => {
      const queueHasSong = prev.queue.some(s => s.id === song.id);
      return {
        ...prev,
        currentSong: song,
        isPlaying: true,
        progress: 0,
        currentTime: 0,
        queue: queueHasSong ? prev.queue : [...prev.queue, song]
      };
    });
    setRepeatCount(prev => prev + 1);
  }, [user, state.currentSong]);

  const playTrackList = useCallback((tracks: Song[], startIndex: number = 0) => {
    const song = tracks[startIndex];
    if (!song) return;
    const videoId = getVideoId(song);
    if (playerRef.current && playerReady.current) playerRef.current.loadVideoById(videoId);
    if (user) {
      addToHistory(user.id, song);
      updateNowPlaying(user.id, song, true, 0);
    }
    setState(prev => ({
      ...prev,
      currentSong: song,
      isPlaying: true,
      progress: 0,
      currentTime: 0,
      queue: tracks,
      isShuffled: false,
    }));
  }, [user]);

  const pauseSong = useCallback(() => {
    if (playerRef.current && playerReady.current) playerRef.current.pauseVideo();
    setState(prev => {
      if (user && prev.currentSong) updateNowPlaying(user.id, prev.currentSong, false, prev.currentTime);
      return { ...prev, isPlaying: false };
    });
  }, [user]);

  const togglePlay = useCallback(() => {
    if (state.isPlaying) pauseSong();
    else {
      if (playerRef.current && playerReady.current) playerRef.current.playVideo();
      setState(prev => ({ ...prev, isPlaying: true }));
    }
  }, [state.isPlaying, pauseSong]);

  const getNextTrack = (direction: 'next' | 'prev') => {
    const { queue, currentSong, isShuffled, repeatMode } = state;
    if (queue.length === 0 || !currentSong) return null;
    const currentIndex = queue.findIndex(s => s.id === currentSong.id);
    if (currentIndex === -1) return queue[0];

    let nextIndex;
    if (isShuffled) {
      do { nextIndex = Math.floor(Math.random() * queue.length); } while (queue.length > 1 && nextIndex === currentIndex);
    } else {
      if (direction === 'next') {
        nextIndex = currentIndex + 1;
        if (nextIndex >= queue.length) {
          if (repeatMode === 'off') return null;
          nextIndex = 0;
        }
      } else {
        nextIndex = currentIndex - 1;
        if (nextIndex < 0) nextIndex = queue.length - 1;
      }
    }
    return queue[nextIndex];
  };

  const nextSong = useCallback(() => {
    const { currentSong, currentTime, duration } = state;

    if (currentSong && currentTime < duration * 0.7) {
      recommendationEngine.current.recordListeningEvent({
        songId: currentSong.id,
        artist: currentSong.artist,
        genre: (currentSong as any).genre,
        action: 'skip',
        timestamp: Date.now(),
        listenDuration: currentTime,
        songDuration: duration,
      });
      setSkipCount(prev => prev + 1);
    }

    const nextTrack = getNextTrack('next');
    if (!nextTrack) {
      setState(prev => ({ ...prev, isPlaying: false }));
      return;
    }
    const videoId = getVideoId(nextTrack);
    if (playerRef.current && playerReady.current) playerRef.current.loadVideoById(videoId);
    if (user) {
      addToHistory(user.id, nextTrack);
      updateNowPlaying(user.id, nextTrack, true, 0);
    }
    setState(prev => ({
      ...prev,
      currentSong: nextTrack,
      progress: 0,
      currentTime: 0,
      isPlaying: true
    }));
  }, [state, user]);

  const prevSong = useCallback(() => {
    if (state.currentTime > 3) {
      seekTo(0);
      return;
    }
    const prevTrack = getNextTrack('prev');
    if (!prevTrack) return;
    const videoId = getVideoId(prevTrack);
    if (playerRef.current && playerReady.current) playerRef.current.loadVideoById(videoId);
    if (user) {
      addToHistory(user.id, prevTrack);
      updateNowPlaying(user.id, prevTrack, true, 0);
    }
    setState(prev => ({
      ...prev,
      currentSong: prevTrack,
      progress: 0,
      currentTime: 0,
      isPlaying: true
    }));
  }, [state, user]);

  const seekTo = useCallback((progress: number) => {
    if (playerRef.current && playerReady.current) {
      const duration = playerRef.current.getDuration();
      if (duration) {
        const seekTime = (progress / 100) * duration;
        playerRef.current.seekTo(seekTime, true);
      }
    }
    setState(prev => {
      const newTime = (progress / 100) * (prev.duration || 0);
      if (user && prev.currentSong) updateNowPlaying(user.id, prev.currentSong, prev.isPlaying, newTime);
      return { ...prev, progress, currentTime: newTime };
    });
  }, [user]);

  const setVolume = useCallback((volume: number) => {
    setState(prev => ({ ...prev, volume }));
  }, []);

  const toggleShuffle = useCallback(() => {
    setState(prev => ({ ...prev, isShuffled: !prev.isShuffled }));
  }, []);

  const toggleRepeat = useCallback(() => {
    setState(prev => ({
      ...prev,
      repeatMode: prev.repeatMode === 'off' ? 'all' : prev.repeatMode === 'all' ? 'one' : 'off',
    }));
  }, []);

  const addToQueue = useCallback((song: Song) => {
    setState(prev => ({ ...prev, queue: [...prev.queue, song] }));
  }, []);

  const clearQueue = useCallback(() => {
    setState(prev => ({ ...prev, queue: [] }));
  }, []);

  const exportUserProfile = useCallback(() => {
    return recommendationEngine.current.exportProfile();
  }, []);

  const resetRecommendations = useCallback(() => {
    recommendationEngine.current.resetProfile();
    console.log("🔄 Recommendation profile reset");
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.isPlaying) {
      interval = setInterval(() => {
        if (playerRef.current && playerRef.current.getCurrentTime) {
          const current = playerRef.current.getCurrentTime();
          const total = playerRef.current.getDuration();
          if (total > 0) {
            setState(prev => ({
              ...prev,
              progress: (current / total) * 100,
              currentTime: current,
              duration: total
            }));
          }
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.isPlaying]);

  // ============================================================================
  // MEDIA SESSION API (Mobile Background Playback)
  // ============================================================================
  useEffect(() => {
    if ('mediaSession' in navigator && state.currentSong) {
      const { currentSong, isPlaying } = state;

      // Update metadata
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist,
        artwork: [
          { src: currentSong.coverUrl || currentSong.image || '', sizes: '96x96', type: 'image/jpeg' },
          { src: currentSong.coverUrl || currentSong.image || '', sizes: '128x128', type: 'image/jpeg' },
          { src: currentSong.coverUrl || currentSong.image || '', sizes: '192x192', type: 'image/jpeg' },
          { src: currentSong.coverUrl || currentSong.image || '', sizes: '256x256', type: 'image/jpeg' },
          { src: currentSong.coverUrl || currentSong.image || '', sizes: '384x384', type: 'image/jpeg' },
          { src: currentSong.coverUrl || currentSong.image || '', sizes: '512x512', type: 'image/jpeg' },
        ]
      });

      // Update playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Set action handlers
      // We use the refs/wrappers to ensure we always use the latest state functions without re-binding too often,
      // though the dependency on `state.currentSong` above will rebuild this when song changes anyway.

      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('previoustrack', () => prevSong());
      navigator.mediaSession.setActionHandler('nexttrack', () => nextSong());

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime && details.fastSeek) {
          // Fast seek if supported, or just normal seek
        }
        if (details.seekTime !== undefined) {
          const percent = (details.seekTime / (state.duration || 1)) * 100;
          seekTo(percent);
        }
      });

      // Clean up isn't strictly necessary for metadata as it gets overwritten, 
      // but good practice might be clearing handlers if component unmounts.
      return () => {
        // Optional: Clear handlers if needed, or let them linger until overwritten
        // navigator.mediaSession.setActionHandler('play', null);
      };
    }
  }, [state.currentSong, state.isPlaying, state.duration, togglePlay, prevSong, nextSong, seekTo]);

  return (
    <PlayerContext.Provider
      value={{
        ...state,
        playSong,
        pauseSong,
        togglePlay,
        nextSong,
        prevSong,
        seekTo,
        setVolume,
        toggleShuffle,
        toggleRepeat,
        addToQueue,
        clearQueue,
        playTrackList,
        exportUserProfile,
        resetRecommendations,
        skipCount,
        repeatCount,
      }}
    >
      {children}
    </PlayerContext.Provider>
  );
};

export const usePlayer = () => {
  const context = useContext(PlayerContext);
  if (!context) throw new Error('usePlayer must be used within a PlayerProvider');
  return context;
};

// ============================================================================
// PLAYER UI COMPONENT
// ============================================================================

const Player: React.FC = () => {
  const {
    currentSong, isPlaying, currentTime, duration,
    volume, togglePlay, setVolume, nextSong, prevSong,
    isShuffled, toggleShuffle, repeatMode, toggleRepeat, seekTo, progress
  } = usePlayer();

  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setIsFullScreen(false); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo((Number(e.target.value) / (duration || 1)) * 100);
  };

  const toggleMute = () => setVolume(volume > 0 ? 0 : 75);

  if (!currentSong) return null;

  return (
    <>
      {/* Desktop Bar */}
      <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="hidden md:flex fixed bottom-6 left-6 right-6 h-20 bg-zinc-900/90 backdrop-blur-2xl border border-white/5 rounded-[2rem] px-8 items-center justify-between z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:bg-zinc-900/95">
        <div className="flex items-center w-[30%] space-x-4 group">
          <div className="relative flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => setIsFullScreen(true)}>
            <motion.img layoutId="desktop-cover" src={currentSong.coverUrl || currentSong.image} className="w-12 h-12 rounded-xl object-cover shadow-lg" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center"><Maximize2 className="w-5 h-5 text-white" /></div>
          </div>
          <div className="overflow-hidden">
            <h4 onClick={() => setIsFullScreen(true)} className="text-sm font-bold truncate text-white cursor-pointer hover:underline decoration-emerald-500 decoration-2 underline-offset-4">{currentSong.title}</h4>
            <p className="text-xs text-zinc-400 truncate font-medium">{currentSong.artist}</p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity"><TrackActionMenu song={currentSong} direction="up" align="left" /></div>
        </div>
        <div className="flex flex-col items-center w-[40%] gap-1">
          <div className="flex items-center space-x-6">
            <button onClick={toggleShuffle} className={`text-xs ${isShuffled ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'}`}><Shuffle className="w-4 h-4" /></button>
            <button onClick={prevSong} className="text-zinc-400 hover:text-white transition-transform active:scale-95"><SkipBack className="w-5 h-5 fill-current" /></button>
            <button onClick={togglePlay} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg">{isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}</button>
            <button onClick={nextSong} className="text-zinc-400 hover:text-white transition-transform active:scale-95"><SkipForward className="w-5 h-5 fill-current" /></button>
            <button onClick={toggleRepeat} className={`text-xs ${repeatMode !== 'off' ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'}`}><Repeat className="w-4 h-4" /></button>
          </div>
          <div className="w-full flex items-center space-x-3 group">
            <span className="text-[10px] font-mono text-zinc-500 w-8 text-right group-hover:text-zinc-300">{formatTime(currentTime)}</span>
            <div className="relative flex-1 h-1 bg-zinc-800 rounded-full group cursor-pointer overflow-hidden"><div className="absolute left-0 top-0 bottom-0 bg-white rounded-full group-hover:bg-emerald-500 transition-colors" style={{ width: `${progress}%` }} /><input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 opacity-0 cursor-pointer" /></div>
            <span className="text-[10px] font-mono text-zinc-500 w-8 group-hover:text-zinc-300">{formatTime(duration)}</span>
          </div>
        </div>
        <div className="flex items-center w-[30%] justify-end space-x-3">
          <button onClick={toggleMute} className="text-zinc-500 hover:text-white">{volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button>
          <div className="relative w-24 h-1 bg-zinc-700 rounded-full overflow-hidden group"><div className="absolute left-0 top-0 bottom-0 bg-white group-hover:bg-emerald-500 transition-colors" style={{ width: `${volume}%` }} /><input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer" /></div>
          <button onClick={() => setIsFullScreen(true)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors"><Maximize2 className="w-4 h-4" /></button>
        </div>
      </motion.div>

      {/* Desktop Fullscreen Overlay */}
      <AnimatePresence>
        {isFullScreen && (
          <DesktopFullScreenPlayer
            currentTrack={currentSong} isPlaying={isPlaying} progress={currentTime} duration={duration} volume={volume}
            isShuffled={isShuffled} repeatMode={repeatMode} onClose={() => setIsFullScreen(false)}
            onTogglePlay={togglePlay} onNext={nextSong} onPrev={prevSong} onSeek={handleSeek}
            onVolumeChange={(e: any) => setVolume(Number(e.target.value))} onToggleShuffle={toggleShuffle} onToggleRepeat={toggleRepeat}
          />
        )}
      </AnimatePresence>

      {/* Mobile Mini */}
      <AnimatePresence>
        {!isMobileExpanded && (
          <motion.div initial={{ y: 150 }} animate={{ y: -64 }} exit={{ y: 150 }} onClick={() => setIsMobileExpanded(true)} className="md:hidden fixed bottom-0 left-2 right-2 h-14 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-xl flex items-center px-3 space-x-3 z-[90] shadow-2xl">
            <img src={currentSong.coverUrl || currentSong.image} className="w-10 h-10 rounded-lg shadow-md object-cover" />
            <div className="flex-1 min-w-0"><h4 className="text-sm font-bold truncate text-white">{currentSong.title}</h4><p className="text-xs text-zinc-400 truncate">{currentSong.artist}</p></div>
            <div className="flex items-center gap-2"><button onClick={(e) => { e.stopPropagation(); togglePlay() }} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black">{isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}</button></div>
            <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-white/10 rounded-full overflow-hidden"><div className="h-full bg-emerald-500" style={{ width: `${progress}%` }} /></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Fullscreen */}
      <AnimatePresence>
        {isMobileExpanded && (
          <motion.div initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="md:hidden fixed inset-0 z-[200] flex flex-col bg-zinc-950">
            <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10"><img src={currentSong.coverUrl || currentSong.image} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[80px]" /><div className="absolute inset-0 bg-black/50" /></div>
            <div className="flex items-center justify-between p-6 pt-12"><button onClick={() => setIsMobileExpanded(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10"><ChevronDown className="w-5 h-5 text-white" /></button><span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Now Playing</span><TrackActionMenu song={currentSong} direction="down" /></div>
            <div className="flex-1 flex items-center justify-center p-6"><motion.div layoutId="track-image" className="w-full max-w-[300px] aspect-square shadow-2xl rounded-2xl overflow-hidden border border-white/10"><img src={currentSong.coverUrl || currentSong.image} className="w-full h-full object-cover" /></motion.div></div>
            <div className="px-8 pb-12 space-y-6">
              <div className="flex justify-between items-start"><div className="space-y-1 overflow-hidden pr-4"><h2 className="text-2xl font-bold text-white truncate leading-tight">{currentSong.title}</h2><p className="text-base text-white/60 font-medium truncate">{currentSong.artist}</p></div><button className="text-zinc-400 hover:text-emerald-500 mt-1"><Heart className="w-6 h-6" /></button></div>
              <div className="space-y-2"><div className="relative h-1 bg-white/10 rounded-full"><div className="absolute left-0 top-0 bottom-0 bg-white rounded-full" style={{ width: `${progress}%` }} /><input type="range" min="0" max={duration || 100} value={currentTime} onChange={handleSeek} className="absolute inset-0 opacity-0 z-10" /></div><div className="flex justify-between text-xs font-medium text-white/40 font-mono"><span>{formatTime(currentTime)}</span><span>{formatTime(duration)}</span></div></div>
              <div className="flex items-center justify-between px-2"><button onClick={toggleShuffle} className={`${isShuffled ? 'text-emerald-400' : 'text-zinc-500'}`}><Shuffle className="w-5 h-5" /></button><div className="flex items-center gap-6"><button onClick={prevSong}><SkipBack className="w-8 h-8 fill-white text-white" /></button><button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-xl active:scale-95 transition-transform">{isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}</button><button onClick={nextSong}><SkipForward className="w-8 h-8 fill-white text-white" /></button></div><button onClick={toggleRepeat} className={`${repeatMode !== 'off' ? 'text-emerald-400' : 'text-zinc-500'}`}><Repeat className="w-5 h-5" /></button></div>
              <div className="flex justify-center items-center px-4 pt-2"><div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider"><Volume2 className="w-4 h-4" /><span>{volume}%</span></div></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ============================================================================
// TASTE PROFILE DASHBOARD COMPONENT
// ============================================================================

interface ProfileData {
  profile: {
    artistPreferences: [string, number][];
    genrePreferences: [string, number][];
    favoriteArtists: string[];
    discoveryOpenness: number;
  };
  history: any[];
}

const StatCard: React.FC<{ label: string; value: number; icon: string }> = ({
  label,
  value,
  icon,
}) => (
  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 hover:bg-zinc-800 transition-colors">
    <div className="text-3xl mb-2">{icon}</div>
    <div className="text-2xl font-bold text-white mb-1">{value}</div>
    <div className="text-xs text-zinc-400 uppercase tracking-wider">{label}</div>
  </div>
);

export const TasteProfileDashboard: React.FC = () => {
  const { exportUserProfile, resetRecommendations } = usePlayer();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = () => {
    try {
      const data = JSON.parse(exportUserProfile());
      setProfileData(data);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  };

  if (!profileData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Music className="w-12 h-12 text-zinc-500 mx-auto mb-4" />
          <p className="text-zinc-400">Loading your taste profile...</p>
        </div>
      </div>
    );
  }

  const topArtists = profileData.profile.artistPreferences
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topGenres = profileData.profile.genrePreferences
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const discoveryLevel = profileData.profile.discoveryOpenness * 100;

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              Your Music DNA
            </h1>
            <p className="text-zinc-400">
              AI-powered insights into your listening patterns
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm('Reset your taste profile? This cannot be undone.')) {
                resetRecommendations();
                loadProfile();
              }
            }}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Reset Profile
          </button>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 rounded-2xl p-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5 text-emerald-400" />
                <h2 className="text-xl font-bold">Discovery Mode</h2>
              </div>
              <p className="text-zinc-400 text-sm">
                How open you are to new music
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold text-emerald-400">
                {discoveryLevel.toFixed(0)}%
              </div>
              <div className="text-xs text-zinc-500 uppercase tracking-wider mt-1">
                {discoveryLevel < 25 ? 'Conservative' :
                  discoveryLevel < 40 ? 'Balanced' :
                    discoveryLevel < 60 ? 'Adventurous' : 'Explorer'}
              </div>
            </div>
          </div>

          <div className="relative h-3 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-1000"
              style={{ width: `${discoveryLevel}%` }}
            />
          </div>

          <div className="mt-4 text-sm text-zinc-400">
            {discoveryLevel < 25 && "You prefer familiar favorites. We'll keep recommendations close to what you know."}
            {discoveryLevel >= 25 && discoveryLevel < 40 && "You enjoy a healthy mix of old and new. Perfect balance!"}
            {discoveryLevel >= 40 && discoveryLevel < 60 && "You're open to exploring new artists and genres. We'll introduce fresh sounds!"}
            {discoveryLevel >= 60 && "You're a music explorer! We'll push boundaries with diverse recommendations."}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold">Top Artists</h2>
            </div>

            <div className="space-y-3">
              {topArtists.map(([artist, score], index) => {
                const maxScore = topArtists[0][1];
                const percentage = (score / maxScore) * 100;

                return (
                  <div key={artist} className="group">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-3">
                        <span className="text-emerald-400 font-bold text-lg w-6">
                          {index + 1}
                        </span>
                        <span className="font-medium group-hover:text-emerald-400 transition-colors">
                          {artist}
                        </span>
                      </div>
                      <span className="text-zinc-500 text-sm font-mono">
                        {score.toFixed(1)}
                      </span>
                    </div>
                    <div className="relative h-2 bg-zinc-800 rounded-full overflow-hidden ml-9">
                      <div
                        className="absolute left-0 top-0 h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-6">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              <h2 className="text-xl font-bold">Favorite Genres</h2>
            </div>

            {topGenres.length > 0 ? (
              <div className="space-y-4">
                {topGenres.map(([genre, score], index) => {
                  const maxScore = topGenres[0][1];
                  const percentage = (score / maxScore) * 100;

                  return (
                    <div key={genre} className="group">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium group-hover:text-cyan-400 transition-colors">
                          {genre}
                        </span>
                        <span className="text-zinc-500 text-sm font-mono">
                          {score.toFixed(1)}
                        </span>
                      </div>
                      <div className="relative h-2.5 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-cyan-500 to-cyan-600 transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Listen to more music to see your genre preferences!</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-6">
            <Shuffle className="w-5 h-5 text-purple-400" />
            <h2 className="text-xl font-bold">Recent Activity</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              label="Songs Played"
              value={profileData.history.length}
              icon="🎵"
            />
            <StatCard
              label="Skipped"
              value={profileData.history.filter(e => e.action === 'skip').length}
              icon="⏭️"
            />
            <StatCard
              label="Replayed"
              value={profileData.history.filter(e => e.action === 'replay').length}
              icon="🔁"
            />
            <StatCard
              label="Full Listens"
              value={profileData.history.filter(e => e.action === 'full_listen').length}
              icon="✅"
            />
          </div>
        </div>

        <div className="bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-4">How AI Learns Your Taste</h2>
          <div className="grid md:grid-cols-3 gap-6 text-sm">
            <div className="space-y-2">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-400 text-lg font-bold mb-3">
                1
              </div>
              <h3 className="font-bold text-white">Listen & Track</h3>
              <p className="text-zinc-400">
                We monitor which songs you play fully, skip, or replay to understand your preferences.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center text-cyan-400 text-lg font-bold mb-3">
                2
              </div>
              <h3 className="font-bold text-white">Build Profile</h3>
              <p className="text-zinc-400">
                Artists and genres you love get higher scores. Skipped content lowers their weight.
              </p>
            </div>
            <div className="space-y-2">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center text-purple-400 text-lg font-bold mb-3">
                3
              </div>
              <h3 className="font-bold text-white">Smart Recommendations</h3>
              <p className="text-zinc-400">
                We balance 70% familiar favorites with 30% new discoveries tailored to your evolving taste.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Player;