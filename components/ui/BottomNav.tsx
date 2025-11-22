import React from 'react';
import { Home, Target, Settings } from '../Icons';
import { ViewMode } from '../../types';

interface BottomNavProps {
  currentView: ViewMode;
  onChangeView: (view: ViewMode) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, onChangeView }) => {
  const navItems = [
    { id: 'home', icon: Home, label: 'Início' },
    { id: 'goals', icon: Target, label: 'Metas' },
    { id: 'settings', icon: Settings, label: 'Ajustes' },
  ] as const;

  return (
    <div className="fixed bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/50 dark:border-slate-700/50 p-2 rounded-[2rem] shadow-[0_20px_40px_rgb(0,0,0,0.1)] dark:shadow-[0_20px_40px_rgb(0,0,0,0.4)] transition-all duration-300 hover:scale-[1.02]">
        {navItems.map((item) => {
          const isActive = currentView === item.id;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-[1.5rem] transition-all duration-300 ${
                isActive 
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 translate-y-[-4px]' 
                  : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              
              {/* Active Indicator Dot inside the button for cleaner look */}
              {isActive && (
                <span className="absolute -bottom-1 w-1 h-1 bg-white/50 rounded-full opacity-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};