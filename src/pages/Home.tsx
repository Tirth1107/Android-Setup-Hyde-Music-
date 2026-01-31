import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Music, Disc, History, Sparkles, ChevronRight, TrendingUp } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { Song } from '../types/music';
import { getRecentlyPlayed } from '../api/db';
import TrackActionMenu from '../components/TrackActionMenu';

const Home: React.FC = () => {
  const { user, profile } = useAuth();
  const { playTrackList } = usePlayer();
  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>([]);
  const [greeting, setGreeting] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting('Good morning');
    else if (hour < 18) setGreeting('Good afternoon');
    else setGreeting('Good evening');
  }, []);

  useEffect(() => {
    if (user) {
      const fetchHistory = async () => {
        setLoading(true);
        // Fetch slightly more to fill the scroll areas
        const data = await getRecentlyPlayed(user.id, 12);
        setRecentlyPlayed(data);
        setLoading(false);
      };
      fetchHistory();
    }
  }, [user]);

  const handlePlay = (song: Song, list: Song[], index: number) => {
    playTrackList(list, index);
  };

  // --- Styles for hiding scrollbar but keeping functionality ---
  // We inject this style tag to ensure it works across all browsers without external CSS files.
  const scrollbarStyles = `
    .no-scrollbar::-webkit-scrollbar {
      display: none;
    }
    .no-scrollbar {
      -ms-overflow-style: none;
      scrollbar-width: none;
    }
  `;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 md:p-12 min-h-full relative overflow-x-hidden pb-32"
    >
      <style>{scrollbarStyles}</style>

      {/* --- Ambient Background --- */}
      <div className="fixed top-0 left-0 w-full h-[800px] bg-gradient-to-b from-emerald-900/20 via-zinc-950 to-black -z-10 pointer-events-none" />
      <div className="fixed -top-20 -right-20 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -z-10 pointer-events-none" />

      {/* --- Header --- */}
      <header className="mb-10 relative z-10">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
               <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/80">Premium Access</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-white capitalize drop-shadow-xl">
            {greeting}
          </h1>
          <p className="text-zinc-400 text-sm md:text-lg font-medium mt-2">
            Let's get back to the rhythm, <span className="text-white font-bold">{profile?.username || 'User'}</span>.
          </p>
        </motion.div>
      </header>

      {/* =======================================================
          SECTION 1: QUICK PICKS (Liquid Cards)
      ======================================================= */}
      <section className="mb-14 relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="w-5 h-5 text-emerald-500" />
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Jump Back In</h2>
        </div>

        {/* Scroll Container */}
        <div className="flex overflow-x-auto pb-4 -mx-6 px-6 gap-4 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-2 lg:grid-cols-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
          
          {recentlyPlayed.slice(0, 6).map((track, i) => (
            <motion.div
              key={`featured-${track.id}-${i}`}
              className="snap-start flex-shrink-0 w-[85vw] sm:w-[350px] md:w-auto"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div 
                className="group relative overflow-hidden rounded-2xl bg-white/[0.03] border border-white/5 transition-all duration-300 cursor-pointer flex items-center pr-4 hover:bg-white/[0.08] hover:border-white/10 shadow-lg"
                onClick={() => handlePlay(track, recentlyPlayed, i)}
              >
                <div className="relative w-20 h-20 flex-shrink-0">
                  <img src={track.coverUrl} className="w-full h-full object-cover" alt="" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                    <Play className="w-8 h-8 fill-white text-white drop-shadow-lg" />
                  </div>
                </div>
                <div className="flex-1 px-4 min-w-0 py-3 flex flex-col justify-center h-20">
                  <h3 className="font-bold text-sm text-white truncate group-hover:text-emerald-400 transition-colors">{track.title}</h3>
                  <p className="text-xs text-zinc-400 truncate mt-1">{track.artist}</p>
                </div>
                
                {/* Action Menu - Visible on Desktop Hover */}
                <div className="hidden md:block opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                   <TrackActionMenu song={track} />
                </div>
              </div>
            </motion.div>
          ))}

          {/* Empty State */}
          {recentlyPlayed.length === 0 && !loading && (
             <div className="col-span-full h-32 flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-2xl text-zinc-500 text-sm bg-black/20">
                <Music className="w-6 h-6 mb-2 opacity-50" />
                <span>Play some music to see quick picks here.</span>
             </div>
          )}
        </div>
      </section>

      {/* =======================================================
          SECTION 2: RECENTLY PLAYED (Square Cards)
      ======================================================= */}
      <section className="mb-14 relative z-10">
        <div className="flex items-center justify-between mb-6 px-1 md:px-0">
          <div className="flex items-center gap-3">
            <History className="w-5 h-5 text-emerald-500" />
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Recently Played</h2>
          </div>
          <button className="text-xs font-bold text-zinc-500 hover:text-white uppercase tracking-wider flex items-center transition-colors">
            View All <ChevronRight className="w-4 h-4 ml-1" />
          </button>
        </div>

        {/* Scroll Container */}
        <div className="flex overflow-x-auto pb-8 -mx-6 px-6 gap-5 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
          {recentlyPlayed.map((track, i) => (
            <motion.div
              key={`grid-${track.id}-${i}`}
              className="snap-start flex-shrink-0 w-36 md:w-auto group cursor-pointer"
              whileHover={{ y: -8 }}
              onClick={() => handlePlay(track, recentlyPlayed, i)}
            >
              <div className="relative mb-3 aspect-square rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 border border-white/5 group-hover:border-white/20 transition-all">
                <img 
                  src={track.coverUrl} 
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" 
                  alt="" 
                />
                
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                  <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                    <Play className="w-6 h-6 fill-black text-black ml-1" />
                  </div>
                </div>
              </div>
              
              <h3 className="font-bold text-sm text-zinc-200 truncate mb-1 group-hover:text-white transition-colors">{track.title}</h3>
              <p className="text-xs text-zinc-500 font-medium truncate group-hover:text-zinc-400">{track.artist}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* =======================================================
          SECTION 3: YOUR VIBE (Wide Cards)
      ======================================================= */}
      <section className="mb-12 relative z-10">
        <div className="flex items-center gap-3 mb-6 px-1 md:px-0">
          <Disc className="w-5 h-5 text-emerald-500" />
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">Curated For You</h2>
        </div>
        
        {/* Scroll Container */}
        <div className="flex overflow-x-auto pb-4 -mx-6 px-6 gap-4 no-scrollbar snap-x snap-mandatory md:grid md:grid-cols-2 lg:gap-6 md:overflow-visible md:pb-0 md:mx-0 md:px-0">
          
          {/* Card 1 */}
          <div className="snap-center flex-shrink-0 w-[85vw] sm:w-auto h-48 md:h-64 rounded-[32px] bg-gradient-to-br from-violet-600 via-indigo-900 to-black p-8 relative overflow-hidden group cursor-pointer border border-white/10 hover:border-white/20 transition-all shadow-2xl">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-white mb-3">
                  Focus
                </span>
                <h3 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter leading-none">Deep Work<br/>Session</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                 <Play className="w-5 h-5 fill-current" />
              </div>
            </div>
            <Music className="absolute -right-8 -bottom-8 w-48 h-48 text-indigo-500/20 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-700 ease-out" />
          </div>

          {/* Card 2 */}
          <div className="snap-center flex-shrink-0 w-[85vw] sm:w-auto h-48 md:h-64 rounded-[32px] bg-gradient-to-br from-orange-500 via-red-900 to-black p-8 relative overflow-hidden group cursor-pointer border border-white/10 hover:border-white/20 transition-all shadow-2xl">
            <div className="relative z-10 h-full flex flex-col justify-between">
              <div>
                <span className="inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[10px] font-black uppercase tracking-widest text-white mb-3">
                  Energy
                </span>
                <h3 className="text-3xl md:text-4xl font-black text-white italic tracking-tighter leading-none">High BPM<br/>Workout</h3>
              </div>
              <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                 <Play className="w-5 h-5 fill-current" />
              </div>
            </div>
            <Disc className="absolute -right-8 -bottom-8 w-48 h-48 text-orange-500/20 rotate-12 group-hover:rotate-0 group-hover:scale-110 transition-all duration-700 ease-out" />
          </div>

        </div>
      </section>
    </motion.div>
  );
};

export default Home;