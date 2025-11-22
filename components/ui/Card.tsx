import React from 'react';

interface CardProps {
  title: string;
  value?: string | React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger';
  className?: string;
  valueClassName?: string;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ 
  title, 
  value, 
  subtitle, 
  onClick, 
  icon, 
  variant = 'default',
  className = '',
  valueClassName,
  children
}) => {
  // Base styles: Glassmorphism, Smooth borders, Modern shadows
  const baseStyles = "relative overflow-hidden rounded-[2rem] p-6 transition-all duration-300 border backdrop-blur-xl";
  
  // Interactive styles: Scale effect and shadow boost on hover/active
  const interactiveStyles = onClick ? "cursor-pointer active:scale-[0.98] hover:shadow-xl hover:-translate-y-1" : "";

  const variants = {
    // Default: White/Dark background with slight transparency for glass effect.
    // border-slate-100/dark:border-slate-800 ensures the main border is subtle,
    // allowing the passed 'className' (border-l-[6px]) to pop.
    default: "bg-white/80 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)]",
    
    // Colored variants for specific highlights (if used)
    primary: "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500/50 shadow-lg shadow-blue-500/20",
    success: "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-500/50 shadow-lg shadow-emerald-500/20",
    danger: "bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-500/50 shadow-lg shadow-rose-500/20",
  };

  return (
    <div 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${interactiveStyles} ${className}`}
    >
      <div className="flex justify-between items-start mb-3">
        <h3 className={`text-xs font-bold uppercase tracking-wider ${variant === 'default' ? 'text-slate-500 dark:text-slate-400' : 'text-white/80'}`}>
          {title}
        </h3>
        {icon && (
          <div className={`${variant === 'default' ? 'text-slate-400 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 p-2.5 rounded-2xl' : 'text-white/90 bg-white/20 p-2.5 rounded-2xl'}`}>
            {icon}
          </div>
        )}
      </div>
      
      {value && (
        <div className={`font-bold tracking-tight drop-shadow-sm ${valueClassName || 'text-xl'}`}>
          {value}
        </div>
      )}
      {subtitle && (
        <div className={`text-xs mt-1 font-medium ${variant === 'default' ? 'text-slate-400 dark:text-slate-500' : 'text-white/70'}`}>
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
};