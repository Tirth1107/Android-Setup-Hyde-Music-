
import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Heart, Music, Clock } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getUserPlaylists, createPlaylist as apiCreatePlaylist } from '../api/db';
import { Song, Playlist as AppPlaylist } from '../types/music';
import { Link } from 'react-router-dom';

const Library: React.FC = () => {
  const { user, profile } = useAuth();
  const [playlists, setPlaylists] = useState<AppPlaylist[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLibrary = async () => {
    if (!user) return;
    setLoading(true);
    const data = await getUserPlaylists(user.id);
    setPlaylists(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchLibrary();
  }, [user]);

  const handleCreatePlaylist = async () => {
    if (!user) return;
    const name = `My Playlist #${playlists.length + 1}`;
    const newPl = await apiCreatePlaylist(user.id, name);
    if (newPl) setPlaylists([...playlists, newPl]);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 md:p-8"
    >
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Your Library</h1>
        <button
          onClick={handleCreatePlaylist}
          className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-full transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
        {/* Liked Songs Special Tile */}
        <Link to="/playlist/liked" className="col-span-2 group">
          <div className="h-full bg-gradient-to-br from-indigo-700 to-purple-400 p-6 rounded-lg relative overflow-hidden shadow-xl hover:scale-[1.02] transition-transform">
            <div className="absolute bottom-6 left-6 z-10">
              <h2 className="text-3xl font-bold mb-2">Liked Songs</h2>
              <p className="text-sm font-medium">Auto-synced from your likes</p>
            </div>
            <Heart className="absolute -top-4 -right-4 w-48 h-48 opacity-10 fill-white" />
          </div>
        </Link>

        {playlists.map((pl) => (
          <Link
            key={pl.id}
            to={`/playlist/${pl.id}`}
            className="bg-zinc-900/40 p-4 rounded-lg hover:bg-zinc-800/60 transition-all cursor-pointer group"
          >
            <div className="aspect-square bg-zinc-800 rounded-md mb-4 flex items-center justify-center relative shadow-lg">
              <Music className="w-12 h-12 text-zinc-600 group-hover:scale-110 transition-transform" />
            </div>
            <h3 className="font-bold truncate">{pl.name}</h3>
            <p className="text-sm text-zinc-500 mt-1">Playlist • {profile?.username || user?.username || 'User'}</p>
          </Link>
        ))}
      </div>
    </motion.div>
  );
};

export default Library;
