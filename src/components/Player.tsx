import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle,
  Volume2, VolumeX, Maximize2, Minimize2, ChevronDown, Heart,
  ListMusic
} from 'lucide-react';
import { usePlayer } from '../hooks/usePlayer';
import TrackActionMenu from './TrackActionMenu';

// --- Helper: Format Time ---
const formatTime = (seconds: number) => {
  if (!seconds) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// --- SUB-COMPONENT: Desktop Full Screen Player (The "Great" Version) ---
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
      {/* --- IMMERSIVE BACKGROUND --- */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <img 
          src={currentTrack.coverUrl || currentTrack.image} 
          alt="" 
          className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[100px] scale-110" 
        />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent" />
      </div>

      {/* --- HEADER --- */}
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

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex w-full max-w-5xl mx-auto px-8 pb-12 items-center justify-center space-x-16">
        
        {/* Cover Art (Fixed Normal Size: 320px) */}
        <motion.div
          layoutId="desktop-cover"
          className="w-[320px] h-[320px] shadow-2xl rounded-2xl overflow-hidden flex-shrink-0 relative group border border-white/10"
        >
          <img src={currentTrack.coverUrl || currentTrack.image} className="w-full h-full object-cover" alt="Cover" />
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
        </motion.div>

        {/* Info & Controls */}
        <div className="flex-1 flex flex-col justify-center space-y-8 max-w-xl">
          
          {/* Titles & Action Menu */}
          <div className="flex justify-between items-start">
            <div className="space-y-2 pr-4">
              <h1 className="text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight line-clamp-2">
                {currentTrack.title}
              </h1>
              <h2 className="text-2xl text-white/60 font-medium tracking-wide">
                {currentTrack.artist}
              </h2>
            </div>
            {/* Action Menu (Accessible) */}
            <div className="mt-2 shrink-0">
               <TrackActionMenu song={currentTrack} direction="down" />
            </div>
          </div>

          {/* Progress Bar */}
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

          {/* Controls Row */}
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

          {/* Volume */}
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

// --- MAIN COMPONENT: Player ---
const Player: React.FC = () => {
  const {
    currentSong, isPlaying, currentTime, duration,
    volume, togglePlay, setVolume, nextSong, prevSong,
    isShuffled, toggleShuffle, repeatMode, toggleRepeat, seekTo
  } = usePlayer();

  const [isMobileExpanded, setIsMobileExpanded] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);

  // Close full screen on ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  const currentTrack = currentSong;
  const progress = currentTime;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    const percentage = (time / (duration || 1)) * 100;
    seekTo(percentage);
  };

  const toggleMute = () => {
    setVolume(volume > 0 ? 0 : 75);
  };

  if (!currentTrack) return null;

  return (
    <>
      {/* ==============================================
          DESKTOP MINI PLAYER (Floating Island)
      ============================================== */}
      <motion.div 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="hidden md:flex fixed bottom-6 left-6 right-6 h-20 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] px-8 items-center justify-between z-[100] shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all hover:bg-zinc-900/95"
      >
        {/* Track Info */}
        <div className="flex items-center w-[30%] space-x-4 group">
          <div className="relative flex-shrink-0 cursor-pointer hover:scale-105 transition-transform duration-300" onClick={() => setIsFullScreen(true)}>
            <motion.img
              layoutId="desktop-cover"
              src={currentTrack.coverUrl || currentTrack.image}
              alt={currentTrack.title}
              className="w-12 h-12 rounded-xl object-cover shadow-lg"
            />
             <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 rounded-xl transition-opacity flex items-center justify-center">
                <Maximize2 className="w-5 h-5 text-white" />
             </div>
          </div>
          <div className="overflow-hidden">
            <h4 onClick={() => setIsFullScreen(true)} className="text-sm font-bold truncate text-white cursor-pointer hover:underline decoration-emerald-500 decoration-2 underline-offset-4">
              {currentTrack.title}
            </h4>
            <p className="text-xs text-zinc-400 truncate font-medium">{currentTrack.artist}</p>
          </div>
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
             <TrackActionMenu song={currentTrack} direction="up" align="left" />
          </div>
        </div>

        {/* Controls */}
        <div className="flex flex-col items-center w-[40%] gap-1">
          <div className="flex items-center space-x-6">
            <button onClick={toggleShuffle} className={`text-xs ${isShuffled ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'}`}>
              <Shuffle className="w-4 h-4" />
            </button>
            <button onClick={prevSong} className="text-zinc-400 hover:text-white transition-transform active:scale-95"><SkipBack className="w-5 h-5 fill-current" /></button>
            <button onClick={togglePlay} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-105 transition-transform shadow-lg">
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>
            <button onClick={nextSong} className="text-zinc-400 hover:text-white transition-transform active:scale-95"><SkipForward className="w-5 h-5 fill-current" /></button>
            <button onClick={toggleRepeat} className={`text-xs ${repeatMode !== 'off' ? 'text-emerald-500' : 'text-zinc-600 hover:text-white'}`}>
              <Repeat className="w-4 h-4" />
            </button>
          </div>
          <div className="w-full flex items-center space-x-3 group">
            <span className="text-[10px] font-mono text-zinc-500 w-8 text-right group-hover:text-zinc-300">{formatTime(progress)}</span>
            <div className="relative flex-1 h-1 bg-zinc-800 rounded-full group cursor-pointer overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 bg-white rounded-full group-hover:bg-emerald-500 transition-colors" style={{ width: `${(progress / (duration || 1)) * 100}%` }} />
              <input type="range" min="0" max={duration || 100} value={progress} onChange={handleSeek} className="absolute inset-0 opacity-0 cursor-pointer" />
            </div>
            <span className="text-[10px] font-mono text-zinc-500 w-8 group-hover:text-zinc-300">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Volume */}
        <div className="flex items-center w-[30%] justify-end space-x-3">
          <button onClick={toggleMute} className="text-zinc-500 hover:text-white">
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
          <div className="relative w-24 h-1 bg-zinc-700 rounded-full overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 bg-white group-hover:bg-emerald-500 transition-colors" style={{ width: `${volume}%` }} />
            <input type="range" min="0" max="100" value={volume} onChange={(e) => setVolume(Number(e.target.value))} className="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
          <button onClick={() => setIsFullScreen(true)} className="p-2 text-zinc-500 hover:text-white hover:bg-white/5 rounded-full transition-colors">
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </motion.div>

      {/* ==============================================
          DESKTOP FULL SCREEN OVERLAY (Integrated)
      ============================================== */}
      <AnimatePresence>
        {isFullScreen && (
          <DesktopFullScreenPlayer
            currentTrack={currentTrack}
            isPlaying={isPlaying}
            progress={progress}
            duration={duration}
            volume={volume}
            isShuffled={isShuffled}
            repeatMode={repeatMode}
            onClose={() => setIsFullScreen(false)}
            onTogglePlay={togglePlay}
            onNext={nextSong}
            onPrev={prevSong}
            onSeek={handleSeek}
            onVolumeChange={(e: any) => setVolume(Number(e.target.value))}
            onToggleShuffle={toggleShuffle}
            onToggleRepeat={toggleRepeat}
          />
        )}
      </AnimatePresence>

      {/* ==============================================
          MOBILE MINI PLAYER
      ============================================== */}
      <AnimatePresence>
        {!isMobileExpanded && (
          <motion.div
            initial={{ y: 150 }}
            animate={{ y: -64 }} // Above bottom nav
            exit={{ y: 150 }}
            onClick={() => setIsMobileExpanded(true)}
            className="md:hidden fixed bottom-0 left-2 right-2 h-14 bg-zinc-900/95 backdrop-blur-2xl border border-white/10 rounded-xl flex items-center px-3 space-x-3 z-[90] shadow-2xl"
          >
            <img src={currentTrack.coverUrl || currentTrack.image} className="w-10 h-10 rounded-lg shadow-md object-cover" alt="" />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold truncate text-white">{currentTrack.title}</h4>
              <p className="text-xs text-zinc-400 truncate">{currentTrack.artist}</p>
            </div>
            <div className="flex items-center gap-2">
               <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-black">
                 {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
               </button>
            </div>
            <div className="absolute bottom-0 left-3 right-3 h-[2px] bg-white/10 rounded-full overflow-hidden">
               <div className="h-full bg-emerald-500" style={{ width: `${(progress / (duration || 1)) * 100}%` }} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ==============================================
          MOBILE FULL SCREEN (Normal Size)
      ============================================== */}
      <AnimatePresence>
        {isMobileExpanded && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="md:hidden fixed inset-0 z-[200] flex flex-col bg-zinc-950"
          >
             {/* Background Blur */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
                <img src={currentTrack.coverUrl || currentTrack.image} className="absolute inset-0 w-full h-full object-cover opacity-30 blur-[80px]" />
                <div className="absolute inset-0 bg-black/50" />
             </div>

            {/* Header */}
            <div className="flex items-center justify-between p-6 pt-12">
              <button onClick={() => setIsMobileExpanded(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/10">
                <ChevronDown className="w-5 h-5 text-white" />
              </button>
              <span className="text-[10px] uppercase tracking-widest text-white/60 font-bold">Now Playing</span>
              <TrackActionMenu song={currentTrack} direction="down" />
            </div>

            {/* Art */}
            <div className="flex-1 flex items-center justify-center p-6">
              <motion.div layoutId="track-image" className="w-full max-w-[300px] aspect-square shadow-2xl rounded-2xl overflow-hidden border border-white/10">
                <img src={currentTrack.coverUrl || currentTrack.image} className="w-full h-full object-cover" />
              </motion.div>
            </div>

            {/* Controls Area */}
            <div className="px-8 pb-12 space-y-6">
              <div className="flex justify-between items-start">
                <div className="space-y-1 overflow-hidden pr-4">
                  <h2 className="text-2xl font-bold text-white truncate leading-tight">{currentTrack.title}</h2>
                  <p className="text-base text-white/60 font-medium truncate">{currentTrack.artist}</p>
                </div>
                <button className="text-zinc-400 hover:text-emerald-500 mt-1"><Heart className="w-6 h-6" /></button>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="relative h-1 bg-white/10 rounded-full">
                  <div className="absolute left-0 top-0 bottom-0 bg-white rounded-full" style={{ width: `${(progress / (duration || 1)) * 100}%` }} />
                  <input type="range" min="0" max={duration || 100} value={progress} onChange={handleSeek} className="absolute inset-0 opacity-0 z-10" />
                </div>
                <div className="flex justify-between text-xs font-medium text-white/40 font-mono">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-between px-2">
                <button onClick={toggleShuffle} className={`${isShuffled ? 'text-emerald-400' : 'text-zinc-500'}`}><Shuffle className="w-5 h-5" /></button>
                <div className="flex items-center gap-6">
                   <button onClick={prevSong}><SkipBack className="w-8 h-8 fill-white text-white" /></button>
                   <button onClick={togglePlay} className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-black shadow-xl active:scale-95 transition-transform">
                     {isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                   </button>
                   <button onClick={nextSong}><SkipForward className="w-8 h-8 fill-white text-white" /></button>
                </div>
                <button onClick={toggleRepeat} className={`${repeatMode !== 'off' ? 'text-emerald-400' : 'text-zinc-500'}`}><Repeat className="w-5 h-5" /></button>
              </div>
              
              {/* Bottom Accessories */}
              <div className="flex justify-between items-center px-4 pt-2">
                 <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase tracking-wider">
                    <Volume2 className="w-4 h-4" />
                    <span>{volume}%</span>
                 </div>
                 <button className="text-zinc-500 hover:text-white flex items-center gap-2 text-xs font-bold uppercase tracking-wider">
                    <ListMusic className="w-4 h-4" />
                    <span>Lyrics</span>
                 </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default Player;