import React from 'react';
import { CormorantEmblem } from './CormorantEmblem';
import { Sparkles } from 'lucide-react';

interface HeaderProps {
  onNavigateToCalendar?: () => void;
  onOpenAssistant?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAssistant }) => {
  return (
    <header
      className="sticky top-0 z-40 backdrop-blur-md border-b transition-colors duration-200"
      style={{
        backgroundColor: 'var(--header-bg)',
        borderColor: 'var(--border-subtle)',
      }}
    >
      <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between relative">
        {/* Logo & Denumire Patrulă cu Butonul Asistent imediat lângă titlu */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <CormorantEmblem size="sm" />
          <span
            className="text-lg sm:text-2xl font-bold font-serif-title tracking-tight block select-none truncate"
            style={{ color: 'var(--text-main)' }}
          >
            Patrula Cormoran
          </span>

          {/* Buton Asistent plasat sus în antet lângă titlu */}
          <button
            type="button"
            onClick={onOpenAssistant}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-700/70 hover:border-emerald-500 text-emerald-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer ml-1 sm:ml-2 shrink-0"
            title="Deschide Asistentul"
            aria-label="Deschide Asistentul"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse shrink-0" />
            <span>Asistent</span>
          </button>
        </div>
      </div>
    </header>
  );
};
