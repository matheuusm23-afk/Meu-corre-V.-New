import React from 'react';

interface CardProps {
  title: string;
  value?: string | React.ReactNode;
  subtitle?: string;
  onClick?: () => void;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger';
  className?: string;
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
  children
}) => {
  const baseStyles = "relative overflow-hidden rounded-2xl p-5 transition-all active:scale-95 shadow-lg border border-slate-800/50";
  
  const variants = {
    default: "bg-slate-900 text-slate-100",
    primary: "bg-blue-600 text-white",
    success: "bg-emerald-600 text-white",
    danger: "bg-rose-600 text-white",
  };

  return (
    <div 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${onClick ? 'cursor-pointer hover:border-slate-700' : ''} ${className}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-400 text-sm font-semibold uppercase tracking-wider">{title}</h3>
        {icon && <div className="text-slate-400">{icon}</div>}
      </div>
      
      {value && <div className="text-2xl font-bold">{value}</div>}
      {subtitle && <div className="text-xs text-slate-500 mt-1">{subtitle}</div>}
      {children}
    </div>
  );
};