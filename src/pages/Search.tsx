import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search as SearchIcon, Play, Clock, AlertCircle, RefreshCcw, Music, X, Disc } from 'lucide-react';
import { searchMusic, getSuggestions } from '../api/client';
import { usePlayer } from '../hooks/usePlayer';
import { Song } from '../types/music';
import TrackActionMenu from '../components/TrackActionMenu';

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [results, setResults] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { playTrackList, currentSong } = usePlayer();

  // --- Auto-Focus on Load ---
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // --- Click Outside to Close Suggestions ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --- Search Handler ---
  const handleSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;

    setQuery(trimmed);
    setShowSuggestions(false);
    setLoading(true);
    setError(null);

    try {
      const data = await searchMusic(trimmed);
      setResults(data);
    } catch (err: any) {
      console.error("Search Error:", err);
      setError("Unable to connect to the music server. Please try again in a few moments.");
    } finally {
      setLoading(false);
    }
  }, []);

  // --- Suggestion Fetcher ---
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 1) {
        const sugs = await getSuggestions(query);
        setSuggestions(sugs);
      } else {
        setSuggestions([]);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [query]);

  // Handle Input Change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "3:45";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 md:p-8 min-h-full pb-32"
    >
      {/* --- Search Bar Section --- */}
      <div className="max-w-4xl mx-auto relative mb-8 z-50" ref={searchContainerRef}>
        <div className="relative group">
          
          {/* LIQUID GLASS SEARCH BAR CONTAINER */}
          <div className="
            relative overflow-hidden rounded-2xl
            bg-zinc-900/80 backdrop-blur-xl
            border border-white/10
            shadow-2xl
            transition-all duration-300
            group-focus-within:border-emerald-500/50
            group-focus-within:ring-2 group-focus-within:ring-emerald-500/20
          ">
            
            <div className="relative flex items-center px-4 md:px-6 py-4">
              <SearchIcon className="w-5 h-5 md:w-6 md:h-6 text-zinc-400 group-focus-within:text-emerald-400 transition-colors duration-300 shrink-0" />
              
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={handleInputChange}
                onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch(query)}
                placeholder="What do you want to listen to?"
                className="w-full bg-transparent pl-3 pr-8 text-lg md:text-xl font-medium text-white placeholder-zinc-500 outline-none"
                autoFocus
              />

              {/* Clear Button */}
              {query && (
                <button 
                  onClick={() => { setQuery(''); setSuggestions([]); setResults([]); inputRef.current?.focus(); }}
                  className="absolute right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 transition-all text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* --- Suggestions Dropdown --- */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 8 }}
              exit={{ opacity: 0, y: -10 }}
              className="
                absolute top-full left-0 right-0 
                bg-zinc-900 border border-white/10
                rounded-xl overflow-hidden shadow-2xl z-50
              "
            >
              {suggestions.map((s, i) => (
                <button
                  key={`sug-${i}`}
                  onClick={() => handleSearch(s)}
                  className="w-full text-left px-5 py-3.5 text-base text-zinc-300 hover:text-white hover:bg-white/5 transition-all flex items-center space-x-3 border-b border-white/5 last:border-0"
                >
                  <SearchIcon className="w-4 h-4 text-zinc-500" />
                  <span className="truncate">{s}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* --- Main Content Area --- */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 opacity-70">
          <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mb-4"></div>
          <p className="text-zinc-400 font-medium text-sm animate-pulse">Searching...</p>
        </div>
      ) : error ? (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-12 text-center max-w-sm mx-auto"
        >
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-4 border border-red-500/20">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h2 className="text-lg font-bold mb-2 text-white">Something went wrong</h2>
          <p className="text-zinc-400 text-sm mb-6">{error}</p>
          <button
            onClick={() => handleSearch(query)}
            className="flex items-center space-x-2 bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-zinc-200 transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
        </motion.div>
      ) : results.length > 0 ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
          <h2 className="text-lg md:text-xl font-bold text-white mb-4 px-2">Top Results</h2>
          
          <div className="space-y-1">
            {results.map((track, i) => {
              const isActive = currentSong?.id === track.id;
              
              return (
                <div
                  key={track.youtube_id || track.id}
                  onClick={() => playTrackList(results, i)}
                  className={`
                    flex items-center gap-3 p-2 md:p-3 rounded-xl cursor-pointer group transition-all
                    ${isActive ? 'bg-emerald-500/10' : 'hover:bg-white/5'}
                  `}
                >
                  {/* Art + Play Button */}
                  <div className="relative w-12 h-12 md:w-14 md:h-14 flex-shrink-0 rounded-md overflow-hidden shadow-sm bg-zinc-800">
                    <img src={track.coverUrl} className="w-full h-full object-cover" alt="" />
                    <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'} transition-opacity`}>
                      {isActive ? (
                         <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" /> 
                      ) : (
                         <Play className="w-5 h-5 text-white fill-white" />
                      )}
                    </div>
                  </div>

                  {/* Info (Flex Grow to take space) */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <span className={`font-semibold truncate text-sm md:text-base ${isActive ? 'text-emerald-400' : 'text-white'}`}>
                      {track.title}
                    </span>
                    <span className="text-xs md:text-sm text-zinc-400 truncate mt-0.5">
                      {track.artist}
                    </span>
                  </div>

                  {/* Duration (Hidden on very small screens) */}
                  <span className="hidden sm:block text-xs text-zinc-500 font-mono w-10 text-right">
                    {formatDuration(track.duration)}
                  </span>

                  {/* Action Menu */}
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <TrackActionMenu song={track} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* --- Empty State: Browse Genres --- */
        <div className="max-w-6xl mx-auto px-1">
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6">Browse Genres</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {[
              { label: 'Pop', color: 'from-pink-500 to-rose-600' },
              { label: 'Hip-Hop', color: 'from-orange-500 to-amber-700' },
              { label: 'Indie', color: 'from-emerald-500 to-teal-700' },
              { label: 'Chill', color: 'from-blue-500 to-indigo-700' },
              { label: 'Rock', color: 'from-purple-500 to-violet-700' },
              { label: 'R&B', color: 'from-indigo-500 to-purple-800' },
              { label: 'Electronic', color: 'from-cyan-400 to-blue-600' },
              { label: 'Jazz', color: 'from-yellow-500 to-orange-600' },
              { label: 'Workout', color: 'from-red-500 to-orange-600' },
              { label: 'Focus', color: 'from-slate-600 to-slate-800' },
            ].map((genre) => (
              <motion.div
                key={genre.label}
                whileHover={{ scale: 1.03, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleSearch(`${genre.label} music`)}
                className={`aspect-square rounded-xl p-4 cursor-pointer relative overflow-hidden bg-gradient-to-br ${genre.color} shadow-lg group`}
              >
                <h3 className="text-xl md:text-2xl font-black italic tracking-tighter text-white uppercase relative z-10 break-words">
                  {genre.label}
                </h3>
                
                {/* Decorative Icon */}
                <Disc className="absolute -right-4 -bottom-4 w-24 h-24 text-white/20 group-hover:rotate-12 transition-transform duration-500" />
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default Search;