import React, { useEffect, useState, useRef } from 'react';
import { useParams, Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, Heart, Clock, MoreHorizontal, Music, Edit2, Trash2, ListPlus, ChevronLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { usePlayer } from '../hooks/usePlayer';
import { useAuth } from '../hooks/useAuth';
import { Song, Playlist } from '../types/music';
import TrackActionMenu from '../components/TrackActionMenu';
import { getPlaylist, removeTrackFromPlaylist, updatePlaylist, deletePlaylist } from '../api/db';

// Helper to format seconds safely since DB might return null
const formatDuration = (seconds?: number) => {
  if (!seconds) return '--:--';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const PlaylistView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const {
    playSong,
    playTrackList,
    currentSong,
    isPlaying,
    togglePlay,
    addToQueue
  } = usePlayer();

  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI State
  const [showMenu, setShowMenu] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');

  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchPlaylistData = async () => {
    if (!user || !id) return;
    setLoading(true);
    setError(null);

    try {
      const plData = await getPlaylist(user.id, id);
      if (!plData) {
        throw new Error("Playlist not found");
      }

      setPlaylist(plData);
      setTracks(plData.songs || []);
      setNewName(plData.name);
    } catch (e: any) {
      console.error("Error fetching playlist:", e);
      setError(e.message || "Failed to load playlist");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylistData();
  }, [id, user]);

  const handleRename = async () => {
    if (!playlist || !newName.trim()) return;
    const oldName = playlist.name;

    setPlaylist(prev => prev ? { ...prev, name: newName.trim() } : null);
    setIsEditing(false);
    setShowMenu(false);

    const success = await updatePlaylist(playlist.id, { name: newName.trim() });

    if (!success) {
      console.error("Rename failed");
      setPlaylist(prev => prev ? { ...prev, name: oldName } : null);
    }
  };

  const handleDelete = async () => {
    if (!playlist || id === 'liked') return;
    if (!window.confirm(`Delete "${playlist.name}"?`)) return;

    const success = await deletePlaylist(playlist.id);

    if (success) navigate('/library');
    else console.error("Delete failed");
  };

  const handlePlayRequest = () => {
    if (tracks.length === 0) return;
    const isPlayingCurrentPlaylist = currentSong && tracks.some(t => t.id === currentSong.id);
    if (isPlayingCurrentPlaylist) {
      togglePlay();
    } else {
      playTrackList(tracks, 0);
    }
  };

  // --- Render ---

  if (loading) return (
    <div className="flex justify-center items-center h-[50vh]">
      <div className="w-8 h-8 border-4 border-emerald-500 rounded-full animate-spin border-t-transparent"></div>
    </div>
  );

  if (error || !playlist) return (
    <div className="text-zinc-400 text-center pt-20 flex flex-col items-center">
      <Music className="w-16 h-16 mb-4 opacity-20" />
      <p>Playlist not found</p>
      <button onClick={() => navigate('/library')} className="mt-4 text-emerald-500 hover:underline">Go to Library</button>
    </div>
  );

  const isGlobalPlaying = isPlaying && currentSong && tracks.some(t => t.id === currentSong.id);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="min-h-full pb-20 relative">
      <header className="relative p-6 md:p-12 flex flex-col md:flex-row items-end space-y-6 md:space-y-0 md:space-x-8 bg-gradient-to-b from-zinc-700/50 to-zinc-900/90 pt-24">
        <div className="w-52 h-52 shadow-2xl rounded-lg overflow-hidden bg-zinc-800 flex items-center justify-center flex-shrink-0">
          {playlist.coverUrl ? (
            <img src={playlist.coverUrl} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-zinc-800 to-zinc-700 flex items-center justify-center">
              <Music className="w-20 h-20 text-zinc-500" />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-4 w-full">
          <p className="text-xs font-bold uppercase tracking-wider text-white">Playlist</p>

          {isEditing ? (
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              onBlur={handleRename}
              autoFocus
              className="text-4xl md:text-6xl font-black bg-transparent border-b border-zinc-500 outline-none w-full text-white"
            />
          ) : (
            <h1
              onClick={() => user?.id === playlist.user_id && setIsEditing(true)}
              className="text-4xl md:text-7xl font-black text-white cursor-pointer hover:opacity-90 transition-opacity truncate"
            >
              {playlist.name}
            </h1>
          )}

          <div className="flex items-center text-sm font-semibold text-zinc-300 space-x-2">
            <span>{profile?.username || 'User'}</span>
            <span className="opacity-50">•</span>
            <span>{tracks.length} songs</span>
          </div>
        </div>
      </header>

      <div className="px-6 md:px-12 py-6 bg-gradient-to-b from-black/20 to-transparent">
        <div className="flex items-center space-x-6 mb-8">
          <button
            onClick={handlePlayRequest}
            className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition-transform group"
          >
            {isGlobalPlaying ? (
              <Pause className="fill-black text-black w-6 h-6" />
            ) : (
              <Play className="fill-black text-black ml-1 w-6 h-6" />
            )}
          </button>

          <div className="relative" ref={menuRef}>
            <button onClick={() => setShowMenu(!showMenu)} className="p-2 text-zinc-400 hover:text-white transition-colors">
              <MoreHorizontal className="w-8 h-8" />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute left-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded shadow-xl z-50 overflow-hidden"
                >
                  <button onClick={() => setIsEditing(true)} className="w-full text-left px-4 py-3 text-zinc-300 hover:bg-zinc-700 flex items-center gap-2">
                    <Edit2 size={16} /> Edit Name
                  </button>
                  {id !== 'liked' && (
                    <button onClick={handleDelete} className="w-full text-left px-4 py-3 text-red-400 hover:bg-zinc-700 flex items-center gap-2 border-t border-zinc-700">
                      <Trash2 size={16} /> Delete Playlist
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {tracks.length === 0 ? (
          <div className="text-zinc-500 text-center py-12 border-t border-zinc-800">
            <p className="mb-4">This playlist is empty.</p>
            <button onClick={() => navigate('/search')} className="text-white bg-zinc-800 hover:bg-zinc-700 px-6 py-2 rounded-full font-bold text-sm transition-colors">
              Find Songs
            </button>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-[16px_1fr_40px] md:grid-cols-[16px_4fr_3fr_40px] gap-4 px-4 py-2 border-b border-zinc-800 text-zinc-400 text-xs uppercase tracking-wider font-medium mb-4 sticky top-16 z-10 bg-[#121212]">
              <span className="text-center">#</span>
              <span>Title</span>
              <span className="hidden md:block">Album</span>
              <span className="flex justify-end"><Clock size={16} /></span>
            </div>

            <div className="space-y-1">
              {tracks.map((track, index) => {
                const isCurrent = currentSong?.id === track.id;

                return (
                  <div
                    key={`${track.id}-${index}`}
                    className={`group grid grid-cols-[16px_1fr_40px] md:grid-cols-[16px_4fr_3fr_40px] gap-4 px-4 py-3 rounded-md transition-colors items-center relative ${isCurrent ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    onDoubleClick={() => playTrackList(tracks, index)}
                  >
                    <div className="flex items-center justify-center text-sm text-zinc-400 w-4">
                      {isCurrent && isPlaying ? (
                        <img src="https://open.spotifycdn.com/cdn/images/equaliser-animated-green.f93a2ef4.gif" className="w-3 h-3" alt="playing" />
                      ) : (
                        <span className="group-hover:hidden">{index + 1}</span>
                      )}
                      <button className="hidden group-hover:block text-white" onClick={() => playTrackList(tracks, index)}>
                        <Play size={14} fill="white" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 overflow-hidden">
                      <img src={track.coverUrl || 'https://via.placeholder.com/40'} className="w-10 h-10 bg-zinc-800 object-cover shadow-sm rounded-sm" alt="" />
                      <div className="flex flex-col overflow-hidden">
                        <span className={`font-medium truncate ${isCurrent ? 'text-emerald-500' : 'text-white'}`}>{track.title}</span>
                        <span className="text-xs text-zinc-400 truncate hover:text-white cursor-pointer hover:underline">{track.artist}</span>
                      </div>
                    </div>

                    <span className="hidden md:block text-zinc-400 text-sm truncate hover:text-white">
                      {track.album || playlist.name}
                    </span>

                    <div className="flex items-center justify-end text-sm text-zinc-400 group">
                      <span className="group-hover:hidden mr-2">{formatDuration(track.duration)}</span>
                      <div className="hidden group-hover:block">
                        <TrackActionMenu
                          song={track}
                          playlistId={id}
                          onRemove={fetchPlaylistData}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PlaylistView;