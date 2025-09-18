import React from 'react';
import { AppView } from '../types';
import { BotIcon, ChartIcon } from './icons/Icons';

interface HeaderProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const Header: React.FC<HeaderProps> = ({ currentView, onNavigate }) => {
  const getButtonClasses = (view: AppView) => {
    const baseClasses = "flex items-center gap-2 px-4 py-2 rounded-md font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500";
    if (currentView === view) {
      return `${baseClasses} bg-indigo-600 text-white shadow-md`;
    }
    return `${baseClasses} bg-white text-slate-600 hover:bg-slate-200`;
  };

  return (
    <header className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-slate-800">Retail Operations Copilot</h1>
          </div>
          <nav className="flex items-center gap-4">
            <button
              onClick={() => onNavigate(AppView.CHATBOT)}
              className={getButtonClasses(AppView.CHATBOT)}
              aria-pressed={currentView === AppView.CHATBOT}
            >
              <BotIcon className="h-5 w-5" />
              <span>Customer Support AI</span>
            </button>
            <button
              onClick={() => onNavigate(AppView.FORECASTER)}
              className={getButtonClasses(AppView.FORECASTER)}
              aria-pressed={currentView === AppView.FORECASTER}
            >
              <ChartIcon className="h-5 w-5" />
              <span>Demand Forecaster</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;