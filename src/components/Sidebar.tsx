
import React, { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Home, Search, Library, PlusSquare, Heart, LogOut } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Playlist } from '../types';

const Sidebar: React.FC = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);

  const fetchPlaylists = async () => {
    if (user) {
      const { data } = await supabase
        .from('playlists')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data) setPlaylists(data);
    }
  };

  useEffect(() => {
    fetchPlaylists();
  }, [user]);

  const handleCreatePlaylist = async () => {
    if (!user) return;
    const name = `My Playlist #${playlists.length + 1}`;
    const { data } = await supabase.from('playlists').insert({
      user_id: user.id,
      name
    }).select().single();

    if (data) {
      setPlaylists([data, ...playlists]);
      navigate(`/playlist/${data.id}`);
    }
  };

  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/library', icon: Library, label: 'Your Library' },
  ];

  return (
    <div className="flex flex-col h-full bg-black text-white p-6 space-y-10">
      <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => navigate('/')}>

        <h1 className="text-2xl font-black tracking-tighter italic">HYDE MUSIC</h1>
      </div>

      <nav className="space-y-6">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center space-x-4 text-sm font-bold transition-all duration-300 ${isActive ? 'text-white scale-105' : 'text-zinc-500 hover:text-white'
              }`
            }
          >
            <item.icon className="w-6 h-6" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="space-y-6">
        <p className="text-[10px] uppercase font-black tracking-widest text-zinc-600 px-1">Library</p>
        <button
          onClick={handleCreatePlaylist}
          className="flex items-center space-x-4 text-sm font-bold text-zinc-500 hover:text-white transition-all w-full group"
        >
          <div className="w-6 h-6 bg-zinc-800 group-hover:bg-white rounded flex items-center justify-center transition-colors">
            <PlusSquare className="w-4 h-4 text-zinc-400 group-hover:text-black" />
          </div>
          <span>Create Playlist</span>
        </button>
        <NavLink
          to="/playlist/liked"
          className={({ isActive }) =>
            `flex items-center space-x-4 text-sm font-bold transition-all ${isActive ? 'text-white' : 'text-zinc-500 hover:text-white'
            }`
          }
        >
          <div className="w-6 h-6 bg-gradient-to-br from-indigo-700 to-purple-400 rounded flex items-center justify-center shadow-lg">
            <Heart className="w-3 h-3 fill-white text-white" />
          </div>
          <span>Liked Songs</span>
        </NavLink>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 -mr-2">
        <ul className="space-y-3">
          {playlists.map((pl) => (
            <li key={pl.id}>
              <NavLink
                to={`/playlist/${pl.id}`}
                className={({ isActive }) =>
                  `text-sm font-medium block truncate transition-all ${isActive ? 'text-emerald-500' : 'text-zinc-500 hover:text-white'
                  }`
                }
              >
                {pl.name}
              </NavLink>
            </li>
          ))}
        </ul>
      </div>

      <div className="pt-6 mt-auto border-t border-zinc-900">
        <button
          onClick={signOut}
          className="flex items-center space-x-4 text-sm font-bold text-zinc-600 hover:text-red-500 transition-all w-full"
        >
          <LogOut className="w-6 h-6" />
          <span>Log Out</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
