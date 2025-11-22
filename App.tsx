
import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Goals } from './components/Goals';
import { Settings } from './components/Settings';
import { FixedExpenses } from './components/FixedExpenses';
import { BottomNav } from './components/ui/BottomNav';
import { Transaction, GoalSettings, ViewMode, FixedExpense } from './types';

type Theme = 'light' | 'dark';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  
  // Theme State
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme;
      if (savedTheme) return savedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  });

  // Global State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [fixedExpenses, setFixedExpenses] = useState<FixedExpense[]>([]);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>({
    monthlyGoal: 3000, 
    monthlyGoals: {}, 
    daysOff: [],
    startDayOfMonth: 1,
  });

  // Persistence
  useEffect(() => {
    const savedTx = localStorage.getItem('transactions');
    const savedGoals = localStorage.getItem('goalSettings');
    const savedFixed = localStorage.getItem('fixedExpenses');
    
    if (savedTx) setTransactions(JSON.parse(savedTx));
    if (savedFixed) setFixedExpenses(JSON.parse(savedFixed));
    if (savedGoals) {
      const parsed = JSON.parse(savedGoals);
      setGoalSettings({
        ...parsed,
        monthlyGoals: parsed.monthlyGoals || {}, 
        startDayOfMonth: parsed.startDayOfMonth || 1
      });
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('goalSettings', JSON.stringify(goalSettings));
  }, [goalSettings]);

  useEffect(() => {
    localStorage.setItem('fixedExpenses', JSON.stringify(fixedExpenses));
  }, [fixedExpenses]);

  // Theme Effect
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Actions
  const handleAddTransaction = (t: Transaction) => {
    setTransactions(prev => [...prev, t]);
  };

  const handleUpdateTransaction = (updatedT: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedT.id ? updatedT : t));
  };

  const handleDeleteTransaction = (id: string) => {
    // Confirmation is handled in the UI components
    setTransactions(prev => prev.filter(t => t.id !== id));
  };

  const handleAddFixedExpense = (e: FixedExpense) => {
    setFixedExpenses(prev => [...prev, e]);
  };

  const handleUpdateFixedExpense = (updated: FixedExpense) => {
    setFixedExpenses(prev => prev.map(e => e.id === updated.id ? updated : e));
  };

  const handleDeleteFixedExpense = (id: string) => {
    // Confirmation is handled in the UI components
    setFixedExpenses(prev => prev.filter(e => e.id !== id));
  };

  const handleClearData = () => {
    setTransactions([]);
    setFixedExpenses([]);
    setGoalSettings({ monthlyGoal: 0, monthlyGoals: {}, daysOff: [], startDayOfMonth: 1 });
    localStorage.clear();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-amber-500/30 transition-colors duration-300">
      <main className="max-w-lg mx-auto min-h-screen px-4">
        {currentView === 'home' && (
          <Dashboard 
            transactions={transactions}
            startDayOfMonth={goalSettings.startDayOfMonth}
            endDayOfMonth={goalSettings.endDayOfMonth}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onChangeView={setCurrentView}
          />
        )}
        {currentView === 'goals' && (
          <Goals 
            goalSettings={goalSettings}
            transactions={transactions}
            onUpdateSettings={setGoalSettings}
            fixedExpenses={fixedExpenses}
          />
        )}
        {currentView === 'fixed-expenses' && (
          <FixedExpenses 
            fixedExpenses={fixedExpenses}
            startDayOfMonth={goalSettings.startDayOfMonth}
            endDayOfMonth={goalSettings.endDayOfMonth}
            onAddExpense={handleAddFixedExpense}
            onUpdateExpense={handleUpdateFixedExpense}
            onDeleteExpense={handleDeleteFixedExpense}
          />
        )}
        {currentView === 'settings' && (
          <Settings 
            onClearData={handleClearData} 
            goalSettings={goalSettings}
            onUpdateSettings={setGoalSettings}
            currentTheme={theme}
            onToggleTheme={toggleTheme}
          />
        )}
      </main>
      
      <BottomNav 
        currentView={currentView} 
        onChangeView={setCurrentView} 
      />
    </div>
  );
};

export default App;
