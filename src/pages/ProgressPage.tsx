import React, { useState, useEffect } from 'react';
import {
  Folder,
  ExternalLink,
  ArrowLeft,
  X,
  LayoutGrid,
  List,
  ChevronRight,
  Sun,
  Moon,
} from 'lucide-react';

interface ScoutProgress {
  id: string;
  name: string;
  initials: string;
  folderId: string;
  driveUrl: string;
}

const SCOUTS: ScoutProgress[] = [
  {
    id: 'alex-mosutiu',
    name: 'Alex Moșuțiu',
    initials: 'AM',
    folderId: '1_5216dEmXjuSuRltKVY3HVcRsHUwp1p8',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1_5216dEmXjuSuRltKVY3HVcRsHUwp1p8',
  },
  {
    id: 'cristian-man',
    name: 'Cristian Man',
    initials: 'CM',
    folderId: '1Y5NRxk5WbaqIFZo_IawNTpc0ja89ziWx',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1Y5NRxk5WbaqIFZo_IawNTpc0ja89ziWx',
  },
  {
    id: 'marius-domsa',
    name: 'Marius Domșa',
    initials: 'MD',
    folderId: '1Ma_vu4XRoFMTd5sAMMNoSzHcwxHChYPM',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1Ma_vu4XRoFMTd5sAMMNoSzHcwxHChYPM',
  },
  {
    id: 'filip-hruban',
    name: 'Filip Hruban',
    initials: 'FH',
    folderId: '1C-H2yGJH3c3ZadMhugGX6OXPANDxdoZi',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1C-H2yGJH3c3ZadMhugGX6OXPANDxdoZi',
  },
  {
    id: 'matei-cosmovici',
    name: 'Matei Cosmovici',
    initials: 'MC',
    folderId: '1n1yZ0oyDQQhSdVZlHJMze70D56SvQNjt',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1n1yZ0oyDQQhSdVZlHJMze70D56SvQNjt',
  },
  {
    id: 'eduard-pop',
    name: 'Eduard Pop',
    initials: 'EP',
    folderId: '1gk_oPa_HRqGVNc0JqwTNG7kD-hqiowZR',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1gk_oPa_HRqGVNc0JqwTNG7kD-hqiowZR',
  },
];

export const ProgressPage: React.FC = () => {
  const [selectedScoutId, setSelectedScoutId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  // Mod scris alb (Dark mode invert) activ implicit pentru a face scrisul alb și vizibil
  const [whiteTextTheme, setWhiteTextTheme] = useState<boolean>(true);

  const selectedScout = SCOUTS.find((scout) => scout.id === selectedScoutId);

  // Închidere vizualizator cu tasta Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedScoutId(null);
      }
    };
    if (selectedScoutId) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedScoutId]);

  return (
    <div className="space-y-4 max-w-3xl mx-auto py-2">
      {/* Butoane moderne și premium cu numele cercetașilor */}
      <div className="flex flex-col gap-3.5">
        {SCOUTS.map((scout) => {
          return (
            <button
              type="button"
              key={scout.id}
              onClick={() => {
                setViewMode('list');
                setSelectedScoutId(scout.id);
              }}
              className="group w-full p-4 sm:p-5 rounded-2xl border border-emerald-500/20 hover:border-emerald-400/60 bg-gradient-to-r from-[#0d131f] via-[#0f1926] to-[#0c121c] hover:from-[#111929] hover:to-[#0f1824] shadow-lg shadow-black/40 hover:shadow-emerald-950/30 flex items-center justify-between cursor-pointer select-none transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                {/* Monogramă / Avatar cercetaș */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 via-emerald-800/40 to-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-sm tracking-wider flex items-center justify-center shadow-inner group-hover:border-emerald-400/70 group-hover:scale-105 transition-all">
                  {scout.initials}
                </div>

                <div className="text-left">
                  <div className="text-base sm:text-lg font-bold font-serif-title tracking-tight text-white group-hover:text-emerald-200 transition-colors">
                    {scout.name}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Dosar Progres
                    </span>
                  </div>
                </div>
              </div>

              {/* Buton Deschide stilizat premium oval */}
              <div className="flex items-center">
                <span className="px-5 py-2.5 rounded-full font-semibold text-xs tracking-wider uppercase bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-md shadow-emerald-950/80 border border-emerald-400/40 flex items-center gap-1.5 group-hover:shadow-emerald-900/60 transition-all">
                  <span>Deschide</span>
                  <ChevronRight className="w-4 h-4 text-emerald-100" />
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Deschidere în aplicație PE TOATĂ PAGINA a folderului Google Drive */}
      {selectedScout && (
        <div className="fixed inset-0 z-[100] bg-[#07090d] flex flex-col">
          {/* Bară de instrumente superioară premium */}
          <div className="h-16 px-4 sm:px-6 bg-gradient-to-r from-[#0c1017] via-[#0f1725] to-[#0c1017] border-b border-emerald-900/40 flex items-center justify-between shrink-0 shadow-lg">
            <div className="flex items-center gap-3 min-w-0">
              {/* Buton Înapoi modern și oval */}
              <button
                type="button"
                onClick={() => setSelectedScoutId(null)}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-700 hover:to-slate-800 border border-slate-700/80 text-white transition-all cursor-pointer text-xs sm:text-sm font-semibold shadow-md active:scale-95"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Înapoi</span>
              </button>

              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 hidden sm:flex items-center justify-center font-bold text-xs">
                  {selectedScout.initials}
                </div>
                <span className="font-bold text-white text-base sm:text-lg font-serif-title truncate">
                  {selectedScout.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Buton comutare Scris Alb / Scris Negru (Dark/Light mode) */}
              <button
                type="button"
                onClick={() => setWhiteTextTheme(!whiteTextTheme)}
                className={`px-3 py-1.5 rounded-full border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                  whiteTextTheme
                    ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 hover:bg-emerald-900/80'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
                }`}
                title="Comută tema pentru vizibilitate optimă a textului"
              >
                {whiteTextTheme ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="hidden md:inline">Scris alb activ</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Scris negru</span>
                  </>
                )}
              </button>

              {/* Selector mod vizualizare: Listă / Grilă */}
              <div className="hidden sm:flex items-center bg-slate-900/90 border border-slate-700/80 rounded-full p-1 shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 font-medium'
                  }`}
                  title="Afișare Listă (nume documente)"
                >
                  <List className="w-3.5 h-3.5" />
                  <span>Listă</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-3 py-1 rounded-full text-xs flex items-center gap-1.5 cursor-pointer transition-all ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 font-medium'
                  }`}
                  title="Afișare Grilă"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Grilă</span>
                </button>
              </div>

              {/* Buton Deschide în Google Drive */}
              <a
                href={selectedScout.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-900/70 to-emerald-950/90 hover:from-emerald-800/80 hover:to-emerald-900/90 border border-emerald-500/40 text-emerald-200 hover:text-white text-xs sm:text-sm font-semibold shadow-md transition-all"
                title="Deschide în Google Drive direct"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden md:inline">Drive</span>
              </a>

              {/* Buton Închide (X) rotund și premium */}
              <button
                type="button"
                onClick={() => setSelectedScoutId(null)}
                className="w-9 h-9 rounded-full bg-slate-800/90 hover:bg-rose-950/90 border border-slate-700/80 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 flex items-center justify-center transition-all cursor-pointer shadow-md"
                title="Închide (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Container pentru fișiere: transformă scrisul în alb curat și fundalul în temă întunecată */}
          <div
            className="flex-1 w-full h-full relative overflow-hidden"
            style={{
              backgroundColor: whiteTextTheme ? '#14161c' : '#ffffff',
            }}
          >
            <iframe
              src={`https://drive.google.com/embeddedfolderview?id=${selectedScout.folderId}#${viewMode}`}
              className="w-full h-full border-0 block"
              style={
                whiteTextTheme
                  ? {
                      filter:
                        'invert(0.92) hue-rotate(180deg) brightness(1.08) contrast(1.1)',
                      backgroundColor: '#ffffff',
                    }
                  : {
                      backgroundColor: '#ffffff',
                    }
              }
              title={`Fișiere dosar Google Drive - ${selectedScout.name}`}
              allow="autoplay; fullscreen"
            />
          </div>
        </div>
      )}
    </div>
  );
};
