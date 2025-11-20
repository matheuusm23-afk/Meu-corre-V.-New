import React from 'react';
import { Card } from './ui/Card';
import { Trash2, AlertCircle } from './Icons';

interface SettingsProps {
  onClearData: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onClearData }) => {
  const handleClear = () => {
    if (window.confirm('Tem certeza? Isso apagará todas as transações e configurações.')) {
      onClearData();
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24 pt-8 px-2">
      <header className="px-2">
        <h1 className="text-2xl font-bold text-slate-100">Configurações ⚙️</h1>
      </header>

      <Card title="Dados">
        <div className="mt-2">
          <p className="text-slate-400 text-sm mb-4">
            Todos os dados ficam salvos apenas no seu celular (navegador).
          </p>
          <button 
            onClick={handleClear}
            className="w-full py-3 px-4 bg-rose-950 text-rose-500 border border-rose-900 rounded-xl flex items-center justify-center gap-2 font-semibold active:bg-rose-900 transition-colors"
          >
            <Trash2 size={18} />
            Limpar Tudo
          </button>
        </div>
      </Card>

      <Card title="Sobre">
        <div className="text-slate-400 text-sm space-y-2">
          <p>Versão 1.0.0</p>
          <p>Feito para ajudar no corre do dia a dia.</p>
        </div>
      </Card>
    </div>
  );
};