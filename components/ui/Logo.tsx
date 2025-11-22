
import React from 'react';

interface LogoProps {
  variant?: 'default' | 'light';
}

export const Logo: React.FC<LogoProps> = ({ variant = 'default' }) => {
  const textColor = variant === 'light' ? 'text-white' : 'text-slate-900 dark:text-white';

  return (
    <div className="flex items-center gap-2 select-none py-2">
      <h1 className={`text-2xl font-bold tracking-tight ${textColor}`}>
        Meu Corre
      </h1>
      <span className="text-2xl">🏍️</span>
    </div>
  );
};
