import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { MoreHorizontal, ListPlus, Plus, Trash2, Heart, ChevronRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { usePlayer } from '../hooks/usePlayer';
import { Song, Playlist as AppPlaylist } from '../types/music';
import { getUserPlaylists, addTrackToPlaylist, removeTrackFromPlaylist, toggleLike, isTrackLiked } from '../api/db';

interface TrackActionMenuProps {
    song: Song;
    playlistId?: string;
    onRemove?: () => void;
    direction?: 'up' | 'down';
    align?: 'left' | 'right';
}

const TrackActionMenu: React.FC<TrackActionMenuProps> = ({
    song,
    playlistId,
    onRemove,
    direction = 'down',
    align = 'right'
}) => {
    const { user } = useAuth();
    const { addToQueue } = usePlayer();
    const [isOpen, setIsOpen] = useState(false);
    const [view, setView] = useState<'main' | 'playlists'>('main');
    const [playlists, setPlaylists] = useState<AppPlaylist[]>([]);
    const [isLiked, setIsLiked] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const [coords, setCoords] = useState({ top: 0, left: 0 });

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        if (isOpen && user) {
            const ytId = song.youtube_id || song.id.replace('yt_', '');
            isTrackLiked(user.id, ytId).then(setIsLiked);

            if (!isMobile && triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const menuWidth = 224; // w-56

                let top = direction === 'down' ? rect.bottom + window.scrollY : rect.top + window.scrollY;
                let left = align === 'right' ? rect.right - menuWidth : rect.left;

                // Edge detection
                if (left < 10) left = 10;
                if (left + menuWidth > window.innerWidth - 10) left = window.innerWidth - menuWidth - 10;

                setCoords({ top, left });
            }
        }
    }, [isOpen, user, song, direction, align, isMobile]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node) &&
                triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
                closeMenu();
            }
        };
        if (isOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const closeMenu = () => {
        setIsOpen(false);
        setTimeout(() => setView('main'), 300);
    };

    const handleFetchPlaylists = async () => {
        if (!user) return;
        const data = await getUserPlaylists(user.id);
        setPlaylists(data);
        setView('playlists');
    };

    const handleAddToPlaylist = async (targetPlaylistId: string) => {
        const success = await addTrackToPlaylist(targetPlaylistId, song);
        if (success) closeMenu();
    };

    const handleRemove = async () => {
        if (!playlistId) return;
        const success = await removeTrackFromPlaylist(playlistId, song);
        if (success && onRemove) onRemove();
        closeMenu();
    };

    const handleToggleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) return;
        const success = await toggleLike(user.id, song);
        if (success) {
            setIsLiked(!isLiked);
            if (playlistId === 'liked' && onRemove) onRemove();
        }
    };

    const menuContent = (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop for Mobile */}
                    {isMobile && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeMenu}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998]"
                        />
                    )}

                    <motion.div
                        ref={menuRef}
                        initial={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: direction === 'down' ? -10 : 10 }}
                        animate={isMobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
                        exit={isMobile ? { y: '100%' } : { opacity: 0, scale: 0.95, y: direction === 'down' ? -10 : 10 }}
                        transition={isMobile ? { type: 'spring', damping: 25, stiffness: 300 } : { duration: 0.2 }}
                        style={isMobile ? {
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px'
                        } : {
                            position: 'absolute',
                            top: direction === 'down' ? coords.top + 8 : coords.top - 8,
                            left: coords.left,
                            transform: direction === 'down' ? 'none' : 'translateY(-100%)'
                        }}
                        className={`bg-zinc-900/95 backdrop-blur-2xl border border-white/10 shadow-2xl z-[9999] overflow-hidden ${isMobile ? 'pb-10 pt-2' : 'w-56 rounded-xl py-1'}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isMobile && (
                            <div className="w-full flex justify-center py-2">
                                <div className="w-10 h-1 bg-zinc-700 rounded-full" />
                            </div>
                        )}

                        <div className="relative">
                            <AnimatePresence mode="wait">
                                {view === 'main' ? (
                                    <motion.div
                                        key="main"
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: -10 }}
                                        className="divide-y divide-white/5"
                                    >
                                        {isMobile && (
                                            <div className="px-6 py-5 flex items-center gap-4">
                                                <img src={song.coverUrl || song.image} className="w-14 h-14 rounded-xl object-cover shadow-2xl" />
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="text-white font-bold text-lg truncate">{song.title}</h4>
                                                    <p className="text-zinc-500 font-medium truncate">{song.artist}</p>
                                                </div>
                                            </div>
                                        )}

                                        <button onClick={(e) => { e.stopPropagation(); addToQueue(song); closeMenu(); }} className="w-full text-left px-6 py-4 sm:py-3 hover:bg-white/5 text-zinc-300 flex items-center gap-4 text-sm font-medium transition-colors">
                                            <ListPlus size={isMobile ? 22 : 16} className="text-zinc-500" />
                                            Add to queue
                                        </button>

                                        <button onClick={handleToggleLike} className="w-full text-left px-6 py-4 sm:py-3 hover:bg-white/5 text-zinc-300 flex items-center gap-4 text-sm font-medium transition-colors">
                                            <Heart size={isMobile ? 22 : 16} className={isLiked ? "fill-emerald-500 text-emerald-500" : "text-zinc-500"} />
                                            {isLiked ? 'Remove from Liked' : 'Save to Liked'}
                                        </button>

                                        <button onClick={(e) => { e.stopPropagation(); handleFetchPlaylists(); }} className="w-full text-left px-6 py-4 sm:py-3 hover:bg-white/5 text-zinc-300 flex items-center justify-between text-sm font-medium transition-colors">
                                            <div className="flex items-center gap-4">
                                                <Plus size={isMobile ? 22 : 16} className="text-zinc-500" />
                                                Add to playlist
                                            </div>
                                            <ChevronRight size={14} className="text-zinc-600" />
                                        </button>

                                        {playlistId && (
                                            <button onClick={(e) => { e.stopPropagation(); handleRemove(); }} className="w-full text-left px-6 py-4 sm:py-3 hover:bg-white/5 text-red-500/80 flex items-center gap-4 text-sm font-medium transition-colors">
                                                <Trash2 size={isMobile ? 22 : 16} />
                                                Remove from this playlist
                                            </button>
                                        )}
                                    </motion.div>
                                ) : (
                                    <motion.div
                                        key="playlists"
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 20 }}
                                        className="max-h-[60vh] overflow-y-auto"
                                    >
                                        <div className="sticky top-0 bg-zinc-900/95 backdrop-blur-md px-5 py-3 border-b border-white/5 flex items-center gap-4">
                                            <button onClick={() => setView('main')} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                                <ChevronLeft size={24} className="text-zinc-400" />
                                            </button>
                                            <span className="text-sm font-bold text-zinc-300">Add to Playlist</span>
                                        </div>
                                        <div className="py-2 divide-y divide-white/5">
                                            {playlists.length === 0 ? (
                                                <div className="px-5 py-12 text-center text-sm text-zinc-500 italic">No playlists found</div>
                                            ) : (
                                                playlists.map(pl => (
                                                    <button
                                                        key={pl.id}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleAddToPlaylist(pl.id);
                                                        }}
                                                        className="w-full text-left px-6 py-5 hover:bg-white/5 text-zinc-300 text-sm font-semibold truncate flex items-center gap-4"
                                                    >
                                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/5">
                                                            <Plus size={16} className="text-zinc-500" />
                                                        </div>
                                                        {pl.name}
                                                    </button>
                                                ))
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );

    return (
        <div className="inline-block relative">
            <button
                ref={triggerRef}
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className={`p-2 transition-all rounded-full hover:bg-white/10 ${isOpen ? 'text-emerald-400 bg-white/5' : 'text-zinc-400 hover:text-white'}`}
            >
                <MoreHorizontal size={isMobile ? 24 : 18} />
            </button>
            {createPortal(menuContent, document.body)}
        </div>
    );
};

export default TrackActionMenu;
