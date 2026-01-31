
import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Search, Library } from 'lucide-react';

const MobileNav: React.FC = () => {
  const navItems = [
    { to: '/', icon: Home, label: 'Home' },
    { to: '/search', icon: Search, label: 'Search' },
    { to: '/library', icon: Library, label: 'Library' },
  ];

  return (
    <div className="bg-black/90 backdrop-blur-3xl border-t border-zinc-900 flex justify-around items-center pt-3 pb-8 px-6">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex flex-col items-center space-y-1.5 transition-all duration-300 ${
              isActive ? 'text-emerald-500 scale-110' : 'text-zinc-600'
            }`
          }
        >
          <item.icon className="w-6 h-6" />
          <span className="text-[9px] font-black uppercase tracking-[0.15em]">
            {item.label}
          </span>
        </NavLink>
      ))}
    </div>
  );
};

export default MobileNav;
