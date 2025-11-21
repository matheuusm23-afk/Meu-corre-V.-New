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
  const baseStyles = "relative overflow-hidden rounded-2xl p-5 transition-all active:scale-95 shadow-sm dark:shadow-lg border";
  
  const variants = {
    default: "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100",
    primary: "bg-blue-600 text-white border-blue-500",
    success: "bg-emerald-600 text-white border-emerald-500",
    danger: "bg-rose-600 text-white border-rose-500",
  };

  return (
    <div 
      onClick={onClick} 
      className={`${baseStyles} ${variants[variant]} ${onClick ? 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-700' : ''} ${className}`}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider">{title}</h3>
        {icon && <div className="text-slate-400 dark:text-slate-500">{icon}</div>}
      </div>
      
      {value && <div className="text-2xl font-bold">{value}</div>}
      {subtitle && <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">{subtitle}</div>}
      {children}
    </div>
  );
};