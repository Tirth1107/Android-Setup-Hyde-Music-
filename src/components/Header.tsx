import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, User, Command, Sparkles } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { motion, AnimatePresence } from 'framer-motion';

const Header: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isSearchPage = location.pathname === '/search';

  // --- Keyboard Shortcut Logic (Ctrl + K) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        navigate('/search');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  return (
    <>
      {/* Main Header Container */}
      <header className="fixed top-0 left-0 right-0 md:left-64 h-24 z-40 px-6 md:px-10 flex items-center justify-between gap-6 transition-all duration-500 pointer-events-none">
        
        {/* --- Left / Center: LIQUID GLASS Search Bar Trigger --- */}
        <div className="relative flex-1 flex items-center justify-start max-w-xl min-w-0 z-10 pointer-events-auto">
          <AnimatePresence mode="wait">
            {!isSearchPage && (
              <motion.div
                initial={{ opacity: 0, y: -20, filter: 'blur(10px)' }}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 0.95, filter: 'blur(10px)' }}
                transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
                onClick={() => navigate('/search')}
                className="w-full group cursor-pointer relative"
              >
                
                {/* ═══════════════════════════════════════════════════════════
                    LAYER 1: AMBIENT GLOW (Outer halo effect)
                    ═══════════════════════════════════════════════════════════ */}
                <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500/30 via-cyan-500/20 to-blue-500/30 rounded-full blur-2xl opacity-0 group-hover:opacity-70 transition-all duration-700 animate-pulse" />

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 2: SECONDARY GLOW (Moving gradient)
                    ═══════════════════════════════════════════════════════════ */}
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-pink-500/10 to-emerald-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-50 transition-all duration-1000 group-hover:animate-spin-slow" />

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 3: LIQUID GLASS CONTAINER (Main element)
                    ═══════════════════════════════════════════════════════════ */}
                <div className="
                  relative overflow-hidden rounded-full
                  flex items-center space-x-4
                  
                  /* Liquid Glass Effect */
                  bg-gradient-to-br from-zinc-900/80 via-zinc-800/70 to-zinc-900/80
                  backdrop-blur-3xl backdrop-saturate-200
                  
                  /* Multi-layer borders */
                  border border-white/20
                  shadow-[0_8px_32px_0_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.1)]
                  
                  px-6 py-4
                  
                  /* Hover states */
                  transition-all duration-500 ease-out
                  group-hover:bg-gradient-to-br group-hover:from-zinc-800/90 group-hover:via-zinc-700/80 group-hover:to-zinc-800/90
                  group-hover:border-emerald-400/40
                  group-hover:shadow-[0_8px_40px_0_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.2)]
                  group-hover:backdrop-blur-[40px]
                  
                  active:scale-[0.98]
                  active:shadow-[0_4px_20px_0_rgba(16,185,129,0.4)]
                ">
                  
                  {/* ═══════════════════════════════════════════════════════════
                      LAYER 4: GLOSSY REFLECTION (Top highlight)
                      ═══════════════════════════════════════════════════════════ */}
                  <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/[0.15] via-white/[0.05] to-transparent pointer-events-none rounded-t-full" />

                  {/* ═══════════════════════════════════════════════════════════
                      LAYER 5: BOTTOM SHADOW (Depth effect)
                      ═══════════════════════════════════════════════════════════ */}
                  <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-b-full" />

                  {/* ═══════════════════════════════════════════════════════════
                      LAYER 6: ANIMATED SHIMMER (Moving light effect)
                      ═══════════════════════════════════════════════════════════ */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000 pointer-events-none" />
                  </div>

                  {/* ═══════════════════════════════════════════════════════════
                      LAYER 7: NOISE TEXTURE (Glass texture)
                      ═══════════════════════════════════════════════════════════ */}
                  <div 
                    className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none rounded-full"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
                    }}
                  />

                  {/* ═══════════════════════════════════════════════════════════
                      LAYER 8: ICON WITH GLOW
                      ═══════════════════════════════════════════════════════════ */}
                  <div className="relative z-10 shrink-0">
                    <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/30 blur-md rounded-full transition-all duration-300" />
                    <Search className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 group-hover:scale-110 group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.8)] transition-all duration-300 relative z-10" />
                  </div>
                  
                  {/* ═══════════════════════════════════════════════════════════
                      LAYER 9: TEXT WITH GRADIENT
                      ═══════════════════════════════════════════════════════════ */}
                  <span className="
                    text-base font-medium 
                    text-zinc-400 
                    group-hover:text-transparent
                    group-hover:bg-clip-text 
                    group-hover:bg-gradient-to-r 
                    group-hover:from-zinc-100 
                    group-hover:via-emerald-200 
                    group-hover:to-cyan-200
                    transition-all duration-300 
                    relative z-10 
                    truncate 
                    tracking-wide 
                    flex-1
                  ">
                    Search library...
                  </span>

                  {/* ═══════════════════════════════════════════════════════════
                      LAYER 10: KEYBOARD SHORTCUT BADGE
                      ═══════════════════════════════════════════════════════════ */}
                  <div className="hidden sm:flex items-center gap-1.5 relative z-10 opacity-60 group-hover:opacity-100 transition-all duration-300">
                     <div className="
                       flex items-center gap-1.5 
                       px-2.5 py-1.5 
                       rounded-lg 
                       bg-gradient-to-br from-white/10 to-white/5
                       backdrop-blur-sm
                       border border-white/10
                       shadow-[0_2px_8px_0_rgba(0,0,0,0.3),inset_0_1px_0_0_rgba(255,255,255,0.1)]
                       group-hover:bg-gradient-to-br group-hover:from-emerald-500/20 group-hover:to-cyan-500/10
                       group-hover:border-emerald-400/30
                       group-hover:shadow-[0_2px_12px_0_rgba(16,185,129,0.3)]
                       transition-all duration-300
                     ">
                        <kbd className="text-[10px] font-bold text-zinc-300 group-hover:text-emerald-300 transition-colors">Ctrl</kbd>
                        <span className="text-zinc-500 text-xs">+</span>
                        <kbd className="text-[10px] font-bold text-zinc-300 group-hover:text-emerald-300 transition-colors">K</kbd>
                     </div>
                  </div>

                  {/* ═══════════════════════════════════════════════════════════
                      LAYER 11: SPARKLE EFFECT (Optional decorative element)
                      ═══════════════════════════════════════════════════════════ */}
                  <div className="absolute top-2 right-4 opacity-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none">
                    <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" />
                  </div>

                </div>

                {/* ═══════════════════════════════════════════════════════════
                    LAYER 12: BOTTOM GLOW REFLECTION (Ground reflection)
                    ═══════════════════════════════════════════════════════════ */}
                <div className="absolute -bottom-1 left-[10%] right-[10%] h-4 bg-gradient-to-b from-emerald-500/20 to-transparent blur-xl opacity-0 group-hover:opacity-60 transition-opacity duration-700 rounded-full" />

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════
            RIGHT: LIQUID GLASS User Profile Button
            ═══════════════════════════════════════════════════════════════════ */}
        <div className="relative flex items-center gap-4 shrink-0 z-10 pointer-events-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/profile')}
            className="
              group relative 
              flex items-center gap-3 
              pl-1.5 pr-1.5 md:pr-5 py-1.5 
              rounded-full 
              
              /* Liquid Glass Effect */
              bg-gradient-to-br from-zinc-900/80 via-zinc-800/70 to-zinc-900/80
              backdrop-blur-2xl backdrop-saturate-150
              
              border border-white/15
              shadow-[0_8px_32px_0_rgba(0,0,0,0.6),inset_0_1px_0_0_rgba(255,255,255,0.1)]
              
              hover:bg-gradient-to-br hover:from-zinc-800/90 hover:via-zinc-700/80 hover:to-zinc-800/90
              hover:border-emerald-500/40
              hover:shadow-[0_8px_40px_0_rgba(16,185,129,0.3),inset_0_1px_0_0_rgba(255,255,255,0.15)]
              
              transition-all duration-300
            "
          >
            {/* Glossy top highlight */}
            <div className="absolute top-0 left-0 right-0 h-[40%] bg-gradient-to-b from-white/10 to-transparent pointer-events-none rounded-t-full" />
            
            {/* Bottom shadow */}
            <div className="absolute bottom-0 left-0 right-0 h-[30%] bg-gradient-to-t from-black/20 to-transparent pointer-events-none rounded-b-full" />

            {/* Ambient glow on hover */}
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/30 to-cyan-500/30 rounded-full blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-500" />

            {/* Avatar */}
            <div className="relative z-10">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  className="
                    w-10 h-10 rounded-full object-cover 
                    shadow-[0_4px_12px_rgba(0,0,0,0.5)] 
                    ring-2 ring-white/10
                    group-hover:ring-emerald-500/50 
                    group-hover:shadow-[0_4px_20px_rgba(16,185,129,0.4)]
                    transition-all duration-500
                  "
                  alt="Profile"
                />
              ) : (
                <div className="
                  w-10 h-10 rounded-full 
                  bg-gradient-to-br from-zinc-700 to-zinc-900 
                  flex items-center justify-center 
                  shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)] 
                  border border-white/10
                  group-hover:bg-gradient-to-br group-hover:from-zinc-600 group-hover:to-zinc-800
                  group-hover:border-emerald-400/30
                  transition-all duration-300
                ">
                  <User className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors duration-300" />
                </div>
              )}
              
              {/* Online Dot with glow */}
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-zinc-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)] group-hover:shadow-[0_0_12px_rgba(16,185,129,1)] transition-shadow duration-300" />
            </div>

            {/* Text Info */}
            <div className="hidden md:flex flex-col items-start text-left mr-1 relative z-10">
              <span className="
                text-[10px] font-bold uppercase tracking-widest 
                text-zinc-500 
                group-hover:text-transparent
                group-hover:bg-clip-text
                group-hover:bg-gradient-to-r
                group-hover:from-emerald-400
                group-hover:to-cyan-400
                transition-all duration-300
              ">
                Account
              </span>
            </div>

            {/* Shimmer effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 overflow-hidden rounded-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
            </div>
          </motion.button>
        </div>
      </header>

      {/* ═══════════════════════════════════════════════════════════════════
          OPTIONAL: Add this to your global CSS for the slow spin animation
          ═══════════════════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes spin-slow {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
      `}</style>
    </>
  );
};

export default Header;