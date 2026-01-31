import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, LogOut, ChevronLeft, Save, Sparkles, 
  Globe, Instagram, Twitter, Check, Camera 
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

// --- EXPANDED AVATAR COLLECTION (50+ Options) ---
const TRENDING_AVATARS = [
  // --- 3D / Emojis ---
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Mario&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Luigi&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/fun-emoji/svg?seed=Peach&backgroundColor=ffdfbf",
  
  // --- Notion Style (Sketchy) ---
  "https://api.dicebear.com/7.x/notionists/svg?seed=Felix&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Aneka&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/notionists/svg?seed=Simba&backgroundColor=b6e3f4",
  
  // --- Adventurers (RPG Style) ---
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Abby&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Brian&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/adventurer/svg?seed=Chris&backgroundColor=c0aede",
  
  // --- 3D Robots ---
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robot1&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robot2&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/bottts/svg?seed=Robot3&backgroundColor=b6e3f4",

  // --- Lorelei (Disney/Modern Style) ---
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Sasha&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Milo&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/lorelei/svg?seed=Oscar&backgroundColor=c0aede",

  // --- Micah (Clean UI Style) ---
  "https://api.dicebear.com/7.x/micah/svg?seed=Oliver&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/micah/svg?seed=Willow&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/micah/svg?seed=George&backgroundColor=ffdfbf",

  // --- Pixel Art ---
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Retro&backgroundColor=b6e3f4",
  "https://api.dicebear.com/7.x/pixel-art/svg?seed=Gamer&backgroundColor=ffdfbf",
  
  // --- Open Peeps (Hand Drawn) ---
  "https://api.dicebear.com/7.x/open-peeps/svg?seed=Buddy&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/open-peeps/svg?seed=Happy&backgroundColor=c0aede",
  "https://api.dicebear.com/7.x/open-peeps/svg?seed=Cool&backgroundColor=b6e3f4",

  // --- Big Ears (Funny) ---
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Funny&backgroundColor=ffdfbf",
  "https://api.dicebear.com/7.x/big-ears/svg?seed=Laugh&backgroundColor=c0aede",
  
  // --- Avataaars (Tech Style) ---
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jack&style=circle&backgroundColor=e5e7eb",
  "https://api.dicebear.com/7.x/avataaars/svg?seed=Jill&style=circle&backgroundColor=b6e3f4",
];

const Profile: React.FC = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // --- Form States ---
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  
  // Social Links States
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');

  // --- Load Data ---
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || '');
      setFullName(profile.full_name || '');
      setAvatarUrl(profile.avatar_url || '');
      setWebsite(profile.website || '');
      setInstagram(profile.instagram_url || '');
      setTwitter(profile.twitter_url || '');
    } else if (user) {
      setUsername(user.email?.split('@')[0] || '');
    }
  }, [profile, user]);

  // Clear notifications
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // --- ADVANCED RANDOMIZER ---
  const generateRandomAvatar = () => {
    const seed = Math.random().toString(36).substring(7);
    // List of all cool styles supported by DiceBear
    const styles = [
      'adventurer', // RPG characters
      'avataaars',  // Tech style
      'big-ears',   // Funny
      'bottts',     // Robots
      'fun-emoji',  // 3D Emojis
      'lorelei',    // Disney style
      'micah',      // Clean UI
      'miniavs',    // Cute minimal
      'notionists', // Sketchy
      'open-peeps', // Hand drawn
      'personas',   // Flat design
      'pixel-art'   // Retro
    ];
    const randomStyle = styles[Math.floor(Math.random() * styles.length)];
    // Randomize background color for extra flair
    const bgColors = ['b6e3f4', 'c0aede', 'd1d4f9', 'ffdfbf', 'ffd5dc', 'transparent'];
    const randomBg = bgColors[Math.floor(Math.random() * bgColors.length)];
    
    const randomUrl = `https://api.dicebear.com/7.x/${randomStyle}/svg?seed=${seed}&backgroundColor=${randomBg}`;
    setAvatarUrl(randomUrl);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    setMessage(null);

    try {
      const updates = {
        id: user.id,
        username,
        full_name: fullName,
        avatar_url: avatarUrl,
        website,
        instagram_url: instagram,
        twitter_url: twitter,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('profiles').upsert(updates);
      if (error) throw error;
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-full p-6 md:p-12 pt-24 max-w-7xl mx-auto pb-32"
    >
      {/* --- Page Header --- */}
      <div className="flex items-center justify-between mb-12">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(-1)} 
            className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-colors border border-white/10 backdrop-blur-md"
          >
            <ChevronLeft className="w-6 h-6 text-zinc-300" />
          </button>
          <div>
            <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter uppercase text-white drop-shadow-lg">
              Edit Profile
            </h1>
            <p className="text-zinc-500 font-medium">Customize your persona</p>
          </div>
        </div>

        <button
            onClick={signOut}
            className="hidden md:flex items-center justify-center space-x-2 px-6 py-2 bg-red-500/10 border border-red-500/20 text-red-500 rounded-full hover:bg-red-500/20 transition-all font-bold text-sm"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* --- LEFT: Avatar Preview & Picker --- */}
        <div className="lg:col-span-5 space-y-8">
          {/* Current Avatar Card */}
          <div className="bg-gradient-to-b from-zinc-900/80 to-black/80 border border-white/10 p-8 rounded-3xl flex flex-col items-center text-center shadow-2xl relative overflow-hidden backdrop-blur-xl">
            
            {/* Glossy Overlay */}
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className="relative mb-6 group">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-zinc-800 bg-zinc-800 shadow-2xl relative z-10 transition-transform group-hover:scale-105">
                {avatarUrl ? (
                  <img src={avatarUrl} className="w-full h-full object-cover" alt="Avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-zinc-700 text-zinc-500 font-black text-5xl">
                    {username?.substring(0,2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-black/50 backdrop-blur-sm rounded-full p-2">
                   <Camera className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-2xl font-bold text-white mb-1 truncate w-full">{fullName || 'Your Name'}</h2>
            <p className="text-emerald-500 font-bold text-sm mb-4">@{username || 'username'}</p>
          </div>

          {/* Quick Picker Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <label className="text-xs font-bold uppercase text-zinc-500 tracking-wider">Choose a Vibe</label>
              <button 
                onClick={generateRandomAvatar}
                className="text-xs font-bold text-emerald-500 flex items-center hover:text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full transition-colors"
              >
                <Sparkles className="w-3 h-3 mr-1" /> Surprise Me
              </button>
            </div>
            
            {/* Scrollable Grid for lots of avatars */}
            <div className="grid grid-cols-4 sm:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {TRENDING_AVATARS.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setAvatarUrl(url)}
                  className={`aspect-square rounded-xl overflow-hidden relative border-2 transition-all ${avatarUrl === url ? 'border-emerald-500 scale-105 shadow-lg shadow-emerald-500/20 z-10' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105 bg-zinc-900'}`}
                >
                  <img src={url} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* --- RIGHT: Edit Form --- */}
        <div className="lg:col-span-7">
          <div className="bg-zinc-900/40 border border-white/5 rounded-3xl p-8 lg:p-10 space-y-8 backdrop-blur-md">
            
            {/* Section 1: Basic Info */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center">
                <User className="w-5 h-5 mr-2 text-emerald-500" />
                Basic Info
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">Display Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-emerald-500 focus:bg-zinc-900 p-4 rounded-xl outline-none text-white transition-all"
                    placeholder="e.g. Alex Smith"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-500 ml-1">Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-emerald-500 focus:bg-zinc-900 p-4 rounded-xl outline-none text-white transition-all"
                    placeholder="e.g. alex_music"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 ml-1">Custom Avatar URL</label>
                <input
                  type="text"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-emerald-500 focus:bg-zinc-900 p-4 rounded-xl outline-none text-zinc-400 font-mono text-sm transition-all"
                  placeholder="https://..."
                />
              </div>
            </div>

            <div className="w-full h-px bg-white/5 my-8" />

            {/* Section 2: Social Links */}
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-white flex items-center">
                <Globe className="w-5 h-5 mr-2 text-emerald-500" />
                Social Links
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-white transition-colors">
                    <Globe className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-emerald-500 pl-12 p-4 rounded-xl outline-none text-white transition-all"
                    placeholder="Website URL"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-pink-500 transition-colors">
                    <Instagram className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={instagram}
                    onChange={(e) => setInstagram(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-pink-500 pl-12 p-4 rounded-xl outline-none text-white transition-all"
                    placeholder="Instagram URL"
                  />
                </div>

                <div className="relative group">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-blue-400 transition-colors">
                    <Twitter className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={twitter}
                    onChange={(e) => setTwitter(e.target.value)}
                    className="w-full bg-zinc-950/50 border border-zinc-800 focus:border-blue-400 pl-12 p-4 rounded-xl outline-none text-white transition-all"
                    placeholder="Twitter URL"
                  />
                </div>
              </div>
            </div>

            {/* Save Action */}
            <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
               {/* Notifications */}
               <div className="h-10 flex items-center">
                 <AnimatePresence>
                    {message && (
                      <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className={`flex items-center px-4 py-2 rounded-lg font-bold text-sm ${
                          message.type === 'success' ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/20' : 'text-red-400 bg-red-400/10'
                        }`}
                      >
                        {message.type === 'success' ? <Check className="w-4 h-4 mr-2" /> : <LogOut className="w-4 h-4 mr-2" />}
                        {message.text}
                      </motion.div>
                    )}
                 </AnimatePresence>
               </div>

              <button
                onClick={handleSave}
                disabled={loading}
                className="w-full md:w-auto px-10 py-4 bg-white text-black rounded-full font-black uppercase tracking-wide hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                <span>{loading ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          </div>

          {/* Mobile Sign Out */}
          <button
            onClick={signOut}
            className="md:hidden w-full mt-6 flex items-center justify-center space-x-2 p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl hover:bg-red-500/20 font-bold"
          >
            <LogOut className="w-5 h-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Profile;