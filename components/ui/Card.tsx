
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
  // Base styles: Compacted padding from p-6 to p-4
  const baseStyles = "relative overflow-hidden rounded-[1.5rem] p-4 transition-all duration-300 border backdrop-blur-xl";
  
  const interactiveStyles = onClick ? "cursor-pointer active:scale-[0.98] hover:shadow-md" : "";

  const variants = {
    default: "bg-white/80 dark:bg-slate-900/60 border-slate-100 dark:border-slate-800 text-slate-900 dark:text-slate-100 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-[0_4px_20px_rgb(0,0,0,0.15)]",
    primary: "bg-gradient-to-br from-blue-600 to-blue-700 text-white border-blue-500/50 shadow-lg shadow-blue-500/20",
    success: "bg-gradient-to-br from-emerald-500 to-emerald-700 text-white border-emerald-500/50 shadow-lg shadow-emerald-500/20",
    danger: "bg-gradient-to-br from-rose-500 to-rose-700 text-white border-rose-500/50 shadow-lg shadow-rose-500/20",
  };

  return (
    <div 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${interactiveStyles} ${className}`}
    >
      <div className="flex justify-between items-start mb-1.5">
        <h3 className={`text-[9px] font-bold uppercase tracking-widest ${variant === 'default' ? 'text-slate-500 dark:text-slate-400' : 'text-white/80'}`}>
          {title}
        </h3>
        {icon && (
          <div className={`${variant === 'default' ? 'text-slate-400 dark:text-slate-400 bg-slate-100/80 dark:bg-slate-800/80 p-1.5 rounded-xl' : 'text-white/90 bg-white/20 p-1.5 rounded-xl'}`}>
            {icon}
          </div>
        )}
      </div>
      
      {value && (
        <div className={`font-black tracking-tighter drop-shadow-sm ${valueClassName || 'text-lg'}`}>
          {value}
        </div>
      )}
      {subtitle && (
        <div className={`text-[9px] mt-0.5 font-bold ${variant === 'default' ? 'text-slate-400 dark:text-slate-500' : 'text-white/70'}`}>
          {subtitle}
        </div>
      )}
      {children}
    </div>
  );
};
