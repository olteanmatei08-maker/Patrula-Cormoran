import React, { useState, useEffect, useRef } from 'react';
import {
  ExternalLink,
  ArrowLeft,
  X,
  LayoutGrid,
  List,
  ChevronRight,
  ShieldAlert,
  Lock,
} from 'lucide-react';

interface ScoutProgress {
  id: string;
  name: string;
  initials: string;
  folderId: string;
  driveUrl: string;
  pin: string;
}

// Lista celor 7 cercetași cu linkurile reale din Google Drive și codurile PIN de 6 cifre, ordonată strict alfabetic
const SCOUTS: ScoutProgress[] = [
  {
    id: 'alex-mosutiu',
    name: 'Alex Moșuțiu',
    initials: 'AM',
    folderId: '1_5216dEmXjuSuRltKVY3HVcRsHUwp1p8',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1_5216dEmXjuSuRltKVY3HVcRsHUwp1p8',
    pin: '250612',
  },
  {
    id: 'cristian-man',
    name: 'Cristian Man',
    initials: 'CM',
    folderId: '1Y5NRxk5WbaqIFZo_IawNTpc0ja89ziWx',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1Y5NRxk5WbaqIFZo_IawNTpc0ja89ziWx',
    pin: '010513',
  },
  {
    id: 'eduard-pop',
    name: 'Eduard Pop',
    initials: 'EP',
    folderId: '1gk_oPa_HRqGVNc0JqwTNG7kD-hqiowZR',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1gk_oPa_HRqGVNc0JqwTNG7kD-hqiowZR',
    pin: '020414',
  },
  {
    id: 'filip-hruban',
    name: 'Filip Hruban',
    initials: 'FH',
    folderId: '1C-H2yGJH3c3ZadMhugGX6OXPANDxdoZi',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1C-H2yGJH3c3ZadMhugGX6OXPANDxdoZi',
    pin: '290610',
  },
  {
    id: 'marius-domsa',
    name: 'Marius Domșa',
    initials: 'MD',
    folderId: '1Ma_vu4XRoFMTd5sAMMNoSzHcwxHChYPM',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1Ma_vu4XRoFMTd5sAMMNoSzHcwxHChYPM',
    pin: '123456',
  },
  {
    id: 'matei-cosmovici',
    name: 'Matei Cosmovici',
    initials: 'MC',
    folderId: '1n1yZ0oyDQQhSdVZlHJMze70D56SvQNjt',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1n1yZ0oyDQQhSdVZlHJMze70D56SvQNjt',
    pin: '150414',
  },
  {
    id: 'matei-oltean',
    name: 'Matei Oltean',
    initials: 'MO',
    folderId: '1jbMxSte0v4SLucPul0wofrgNyiQFFs2S',
    driveUrl: 'https://drive.google.com/drive/u/0/folders/1jbMxSte0v4SLucPul0wofrgNyiQFFs2S',
    pin: '020411',
  },
].sort((a, b) => a.name.localeCompare(b.name, 'ro'));

export const ProgressPage: React.FC = () => {
  const [selectedScoutId, setSelectedScoutId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  // Stare pentru fereastra PIN securizat (6 cifre pentru fiecare cercetaș)
  const [pendingScoutId, setPendingScoutId] = useState<string | null>(null);
  const [pinValue, setPinValue] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const pinInputRef = useRef<HTMLInputElement>(null);

  const selectedScout = SCOUTS.find((scout) => scout.id === selectedScoutId);
  const pendingScout = SCOUTS.find((scout) => scout.id === pendingScoutId);

  // Focus pe input când se deschide modalul de PIN
  useEffect(() => {
    if (pendingScoutId) {
      setPinValue('');
      setPinError(null);
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 50);
    }
  }, [pendingScoutId]);

  // Închidere vizualizator cu tasta Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (pendingScoutId) {
          setPendingScoutId(null);
        } else if (selectedScoutId) {
          setSelectedScoutId(null);
        }
      }
    };
    if (selectedScoutId || pendingScoutId) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [selectedScoutId, pendingScoutId]);

  const handleScoutClick = (scoutId: string) => {
    setPendingScoutId(scoutId);
  };

  const verifyPin = (code: string) => {
    if (!pendingScout) return;

    if (code === pendingScout.pin) {
      setSelectedScoutId(pendingScout.id);
      setViewMode('list');
      setPendingScoutId(null);
      setPinValue('');
      setPinError(null);
    } else {
      setPinError('PIN incorect. Încearcă din nou.');
      setPinValue('');
      setTimeout(() => {
        pinInputRef.current?.focus();
      }, 50);
    }
  };

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyPin(pinValue);
  };

  const handlePinChange = (val: string) => {
    // Permite doar cifre, maxim 6
    const cleaned = val.replace(/\D/g, '').slice(0, 6);
    setPinValue(cleaned);
    if (pinError) setPinError(null);

    // Auto-validare la introducerea celor 6 cifre
    if (cleaned.length === 6) {
      verifyPin(cleaned);
    }
  };

  return (
    <div className="space-y-4 max-w-3xl mx-auto py-2">
      {/* Butoane cercetași ordonate strict alfabetic - deschidere la apăsare pe nume */}
      <div className="flex flex-col gap-3.5">
        {SCOUTS.map((scout) => {
          return (
            <button
              type="button"
              key={scout.id}
              onClick={() => handleScoutClick(scout.id)}
              className="group w-full p-4 sm:p-5 rounded-2xl border border-emerald-500/20 hover:border-emerald-400/60 bg-gradient-to-r from-[#0d131f] via-[#0f1926] to-[#0c121c] hover:from-[#111929] hover:to-[#0f1824] shadow-lg shadow-black/40 hover:shadow-emerald-950/40 flex items-center justify-between cursor-pointer select-none transition-all duration-200"
            >
              <div className="flex items-center gap-4">
                {/* Monogramă cercetaș */}
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500/25 via-emerald-800/40 to-emerald-950/80 border border-emerald-500/40 text-emerald-300 font-bold text-sm tracking-wider flex items-center justify-center shadow-inner group-hover:border-emerald-400/70 group-hover:scale-105 transition-all shrink-0">
                  {scout.initials}
                </div>

                {/* Nume cercetaș cu pictogramă de securitate discretă */}
                <div className="flex items-center gap-2.5">
                  <div className="text-left text-base sm:text-xl font-bold font-serif-title tracking-tight text-white group-hover:text-emerald-200 transition-colors">
                    {scout.name}
                  </div>
                  <Lock className="w-3.5 h-3.5 text-slate-500 group-hover:text-emerald-400/80 transition-colors" />
                </div>
              </div>

              {/* Indicator la dreapta */}
              <div className="flex items-center pl-2">
                <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-emerald-300 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          );
        })}
      </div>

      {/* FEREASTRĂ SIMPLĂ DE INTRODUCERE PIN DE 6 CIFRE PENTRU ORICARE CERCETAȘ */}
      {pendingScout && (
        <div className="fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0b1019] border border-emerald-500/40 rounded-3xl p-6 sm:p-7 shadow-2xl shadow-black/80 text-center space-y-5 relative animate-in fade-in zoom-in-95 duration-150">
            {/* Buton Închide */}
            <button
              type="button"
              onClick={() => setPendingScoutId(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Pictogramă lacăt */}
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-inner">
              <Lock className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg sm:text-xl font-bold font-serif-title text-white">
                {pendingScout.name}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Introdu codul PIN de 6 cifre
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="space-y-4">
              {/* Input ascuns pentru tastatură și suport mobil */}
              <input
                ref={pinInputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinValue}
                onChange={(e) => handlePinChange(e.target.value)}
                className="opacity-0 absolute -z-10 pointer-events-none"
                autoFocus
              />

              {/* Căsuțe vizuale pentru cele 6 cifre */}
              <div
                onClick={() => pinInputRef.current?.focus()}
                className="flex items-center justify-center gap-2 sm:gap-2.5 cursor-pointer py-1"
              >
                {[0, 1, 2, 3, 4, 5].map((idx) => {
                  const digit = pinValue[idx];
                  const isCurrent = pinValue.length === idx;
                  const hasError = !!pinError;

                  return (
                    <div
                      key={idx}
                      className={`w-9 sm:w-11 h-12 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center text-lg sm:text-xl font-bold transition-all ${
                        hasError
                          ? 'border-2 border-rose-500 bg-rose-950/30 text-rose-300'
                          : digit !== undefined
                          ? 'border-2 border-emerald-400 bg-emerald-950/40 text-white'
                          : isCurrent
                          ? 'border-2 border-emerald-500 bg-slate-900 shadow-md shadow-emerald-500/20'
                          : 'border border-slate-700 bg-slate-900/80 text-slate-500'
                      }`}
                    >
                      {digit !== undefined ? '•' : ''}
                    </div>
                  );
                })}
              </div>

              {/* Mesaj de eroare */}
              {pinError && (
                <div className="text-xs font-semibold text-rose-400">
                  {pinError}
                </div>
              )}

              {/* Butoane */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setPendingScoutId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs sm:text-sm font-semibold transition-all cursor-pointer"
                >
                  Anulează
                </button>
                <button
                  type="submit"
                  disabled={pinValue.length !== 6}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white text-xs sm:text-sm font-bold transition-all shadow-md cursor-pointer"
                >
                  Continuă
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deschidere directă a folderului Google Drive pe toată pagina */}
      {selectedScout && (
        <div className="fixed inset-0 z-[100] bg-[#07090d] flex flex-col">
          {/* Bară de instrumente superioară modernă și curată */}
          <div className="h-18 sm:h-20 px-4 sm:px-8 bg-gradient-to-r from-[#0c1017] via-[#0f1725] to-[#0c1017] border-b border-emerald-900/40 flex items-center justify-between shrink-0 shadow-xl">
            <div className="flex items-center gap-3 sm:gap-4 min-w-0">
              {/* Buton Înapoi */}
              <button
                type="button"
                onClick={() => setSelectedScoutId(null)}
                className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-white transition-all cursor-pointer text-xs sm:text-sm font-bold shadow-md hover:shadow-lg active:scale-95 shrink-0"
              >
                <ArrowLeft className="w-4 h-4 text-emerald-400" />
                <span>Înapoi</span>
              </button>

              <div className="flex items-center gap-2.5 truncate">
                <div className="w-9 h-9 rounded-xl bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 hidden sm:flex items-center justify-center font-bold text-xs shrink-0 shadow-inner">
                  {selectedScout.initials}
                </div>
                <span className="font-bold text-white text-base sm:text-xl font-serif-title truncate">
                  {selectedScout.name}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5 sm:gap-3.5 shrink-0">
              {/* Selector mod vizualizare: Listă / Grilă */}
              <div className="hidden sm:flex items-center bg-slate-900/90 border border-slate-700/80 rounded-full p-1.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all ${
                    viewMode === 'list'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 font-medium'
                  }`}
                  title="Afișare Listă (nume documente)"
                >
                  <List className="w-4 h-4" />
                  <span>Listă</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`px-4 py-2 rounded-full text-xs sm:text-sm flex items-center gap-2 cursor-pointer transition-all ${
                    viewMode === 'grid'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-bold shadow-md'
                      : 'text-slate-400 hover:text-slate-200 font-medium'
                  }`}
                  title="Afișare Grilă"
                >
                  <LayoutGrid className="w-4 h-4" />
                  <span>Grilă</span>
                </button>
              </div>

              {/* Buton Deschide în Google Drive */}
              <a
                href={selectedScout.driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hidden md:inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-emerald-900/80 to-emerald-950/90 hover:from-emerald-800/90 hover:to-emerald-900/90 border border-emerald-500/50 text-emerald-200 hover:text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-emerald-950/60 transition-all active:scale-95"
                title="Deschide direct în Google Drive"
              >
                <ExternalLink className="w-4 h-4 text-emerald-400" />
                <span>Drive</span>
              </a>

              {/* Buton Închide (X) */}
              <button
                type="button"
                onClick={() => setSelectedScoutId(null)}
                className="w-10 sm:w-11 h-10 sm:h-11 rounded-full bg-slate-800/90 hover:bg-rose-950/90 border border-slate-700/80 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 flex items-center justify-center transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                title="Închide (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mențiune privind politica de securitate Google */}
          <div className="px-4 py-2.5 bg-gradient-to-r from-[#0a0f17] via-[#0d1624] to-[#0a0f17] border-b border-emerald-900/30 flex items-center justify-center gap-2 text-center text-xs sm:text-sm text-slate-300 shadow-inner shrink-0">
            <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Fișierele se vor deschide în browser din cauza politicii de securitate Google.</span>
          </div>

          {/* Vizualizare exclusivă Google Drive Folder cu ascunderea barei de antet („Titlu și Ultima modificare”) */}
          <div className="flex-1 w-full h-full relative overflow-hidden bg-[#14161c]">
            <iframe
              src={`https://drive.google.com/embeddedfolderview?id=${selectedScout.folderId}#${viewMode}`}
              className={`w-full border-0 block ${
                viewMode === 'list'
                  ? 'h-[calc(100%+42px)] -mt-[42px]'
                  : 'h-full'
              }`}
              style={{
                filter:
                  'invert(0.92) hue-rotate(180deg) brightness(1.08) contrast(1.1)',
                backgroundColor: '#ffffff',
              }}
              title={`Fișiere dosar Google Drive - ${selectedScout.name}`}
              allow="autoplay; fullscreen"
            />
          </div>
        </div>
      )}
    </div>
  );
};
