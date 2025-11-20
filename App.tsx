import React, { useState, useEffect } from 'react';
import { Dashboard } from './components/Dashboard';
import { Goals } from './components/Goals';
import { Settings } from './components/Settings';
import { BottomNav } from './components/ui/BottomNav';
import { Transaction, GoalSettings, ViewMode } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewMode>('home');
  
  // Global State
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goalSettings, setGoalSettings] = useState<GoalSettings>({
    monthlyGoal: 3000,
    daysOff: [],
  });

  // Persistence
  useEffect(() => {
    const savedTx = localStorage.getItem('transactions');
    const savedGoals = localStorage.getItem('goalSettings');
    if (savedTx) setTransactions(JSON.parse(savedTx));
    if (savedGoals) setGoalSettings(JSON.parse(savedGoals));
  }, []);

  useEffect(() => {
    localStorage.setItem('transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('goalSettings', JSON.stringify(goalSettings));
  }, [goalSettings]);

  // Actions
  const handleAddTransaction = (t: Transaction) => {
    setTransactions(prev => [...prev, t]);
  };

  const handleUpdateTransaction = (updatedT: Transaction) => {
    setTransactions(prev => prev.map(t => t.id === updatedT.id ? updatedT : t));
  };

  const handleDeleteTransaction = (id: string) => {
    if (window.confirm('Apagar essa movimentação?')) {
      setTransactions(prev => prev.filter(t => t.id !== id));
    }
  };

  const handleClearData = () => {
    setTransactions([]);
    setGoalSettings({ monthlyGoal: 0, daysOff: [] });
    localStorage.clear();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-amber-500/30">
      <main className="max-w-lg mx-auto min-h-screen px-4">
        {currentView === 'home' && (
          <Dashboard 
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}
        {currentView === 'goals' && (
          <Goals 
            goalSettings={goalSettings}
            transactions={transactions}
            onUpdateSettings={setGoalSettings}
          />
        )}
        {currentView === 'settings' && (
          <Settings onClearData={handleClearData} />
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