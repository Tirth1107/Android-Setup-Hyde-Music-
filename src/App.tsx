
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { PlayerProvider } from './hooks/usePlayer';

import Sidebar from './components/Sidebar';
import Player from './components/Player';
import Header from './components/Header';
import Auth from './pages/Auth';
import Home from './pages/Home';
import Search from './pages/Search';
import Library from './pages/Library';
import PlaylistView from './pages/Playlist';
import Profile from './pages/Profile';
import MobileNav from './components/MobileNav';
import { wakeUpBackend } from './api/wakeup';
import { useState, useEffect } from 'react';

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isServerReady, setIsServerReady] = useState(false);

  useEffect(() => {
    wakeUpBackend().then(() => {
      setIsServerReady(true);
    });
  }, []);

  if (loading || !isServerReady) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-black gap-4">
        <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        {!isServerReady && <p className="text-emerald-500 animate-pulse font-medium">Waking up server (this may take ~50s)...</p>}
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" />;
  }

  return (
    <div className="h-screen w-screen bg-black flex flex-col md:flex-row overflow-hidden text-white">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-64 bg-black border-r border-zinc-900 shrink-0">
        <Sidebar />
      </div>

      {/* Global Header */}
      <Header />

      {/* Main Content - pt-20 on mobile, pt-24 on desktop to match header height */}
      <main className="flex-1 overflow-y-auto relative pb-32 md:pb-24 pt-20 md:pt-24">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </main>

      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
        <MobileNav />
      </div>

      {/* Global Player */}
      <Player />

      {/* Hidden YouTube IFrame mount point handled by PlayerProvider now */}
    </div>
  );
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/*" element={
        <AppLayout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/library" element={<Library />} />
            <Route path="/playlist/:id" element={<PlaylistView />} />
            <Route path="/profile" element={<Profile />} />
          </Routes>
        </AppLayout>
      } />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <AppRoutes />
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
