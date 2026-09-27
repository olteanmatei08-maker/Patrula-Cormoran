import React, { useState } from 'react';
import { CormorantEmblem } from '../components/CormorantEmblem';
import {
  PATROL_TESTAMENT,
  PATROL_HISTORY,
  PATROL_LEADERS,
} from '../data/patrolData';
import {
  Search,
  Shield,
  Heart,
  Users,
  Compass,
  Scroll,
  Mountain,
  ExternalLink,
} from 'lucide-react';

function getPatrolYears(): number {
  const today = new Date();
  const currentYear = today.getFullYear();
  // Month is 0-indexed: October is 9
  const hasPassedOct5 =
    today.getMonth() > 9 || (today.getMonth() === 9 && today.getDate() >= 5);
  return hasPassedOct5 ? currentYear - 2002 : currentYear - 2002 - 1;
}

export const AboutPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const patrolYears = getPatrolYears();

  const filteredLeaders = PATROL_LEADERS.filter((l) =>
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.period.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const dimensions = [
    {
      title: 'Natura',
      desc: 'Locul desfășurării tuturor activităţilor.',
      icon: Mountain,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-800/50',
    },
    {
      title: 'Patrula',
      desc: 'Unitatea de bază a cercetășiei.',
      icon: Users,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-800/50',
    },
    {
      title: 'Legea',
      desc: 'Ghid al comportamentului cercetășesc.',
      icon: Scroll,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-800/50',
    },
    {
      title: 'Promisiunea',
      desc: 'Promisiune făcută în mod liber.',
      icon: Heart,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-800/50',
    },
    {
      title: 'Spiritul civic',
      desc: 'Promovarea responsabilității față de comunitate.',
      icon: Shield,
      color: 'text-emerald-400',
      bg: 'bg-emerald-950/40 border-emerald-800/50',
    },
  ];

  return (
    <div className="space-y-16 max-w-4xl mx-auto py-4 animate-in fade-in duration-300">
      {/* ========================================================================= */}
      {/* PARTEA 1: TOT CE ERA ÎN PAGINA ACASĂ (PĂSTRAT FIX CUM ERA) */}
      {/* ========================================================================= */}

      {/* App Header & Cormorant Bird Emblem */}
      <section className="min-h-[calc(100vh-14rem)] sm:min-h-[calc(100vh-16rem)] flex flex-col justify-center items-center text-center space-y-6 pt-4 pb-12">
        <div className="flex justify-center">
          <CormorantEmblem size="xl" />
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-serif-title uppercase">
            Patrula Cormoran
          </h1>
          <p className="text-sm sm:text-base text-slate-400 font-medium">
            Cercetașii Munților
          </p>
          <p className="text-xs text-slate-500 font-medium tracking-wide">
            {patrolYears} de ani de activitate
          </p>
        </div>
      </section>

      {/* Testament */}
      <section className="p-8 sm:p-10 rounded-2xl bg-[#0c1017] border border-slate-800 shadow-xl space-y-6">
        <h2 className="text-2xl font-bold text-white font-serif-title pb-4 border-b border-slate-800">
          {PATROL_TESTAMENT.title}
        </h2>

        <div className="space-y-5 text-slate-300 text-base sm:text-lg leading-relaxed font-light">
          <p>{PATROL_TESTAMENT.text1}</p>
          <p>{PATROL_TESTAMENT.text2}</p>
          <p className="text-white font-normal italic">
            „{PATROL_TESTAMENT.text3}”
          </p>
        </div>

        <div className="pt-4 border-t border-slate-800/80 text-right">
          <span className="text-sm sm:text-base font-semibold text-slate-200">
            — {PATROL_TESTAMENT.author}
          </span>
        </div>
      </section>

      {/* Scurt istoric */}
      <section className="p-8 sm:p-10 rounded-2xl bg-[#0c1017] border border-slate-800 shadow-xl space-y-5">
        <h2 className="text-2xl font-bold text-white font-serif-title pb-4 border-b border-slate-800">
          {PATROL_HISTORY.title}
        </h2>

        <div className="space-y-4 text-slate-300 text-base sm:text-lg leading-relaxed font-light">
          <p>{PATROL_HISTORY.paragraph1}</p>
          <p>{PATROL_HISTORY.paragraph2}</p>
        </div>
      </section>

      {/* Istoric șefi · Cormoran */}
      <section className="p-8 sm:p-10 rounded-2xl bg-[#0c1017] border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <h2 className="text-2xl font-bold text-white font-serif-title">
            Istoric șefi · Cormoran
          </h2>

          <div className="relative min-w-[220px]">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Caută în istoric..."
              className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        <div className="divide-y divide-slate-800/80">
          {filteredLeaders.map((leader) => (
            <div
              key={leader.name + leader.period}
              className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-3">
                  <span className="text-base sm:text-lg font-bold text-white">
                    {leader.name}
                  </span>
                  {leader.isCurrent && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-red-600 text-white">
                      ACTUAL
                    </span>
                  )}
                </div>
              </div>

              <div className="text-sm sm:text-base font-medium text-slate-400 font-mono shrink-0">
                {leader.period}
              </div>
            </div>
          ))}
        </div>

        {filteredLeaders.length === 0 && (
          <div className="text-center py-6 text-slate-500 text-sm">
            Niciun rezultat găsit.
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* LINIE DE DEMARCARE (SEPARATOR) */}
      {/* ========================================================================= */}
      <div className="pt-6 pb-2">
        <hr className="border-t-2 border-slate-800/90" />
      </div>

      {/* ========================================================================= */}
      {/* PARTEA 2: CE ERA ÎN PAGINA DESPRE (SUB CE ERA ÎN ACASĂ) */}
      {/* ========================================================================= */}

      {/* Header Ramura Verde */}
      <section className="text-center space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-950/70 border border-emerald-800/60 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>12 – 17 ani</span>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white font-serif-title">
            Ramura Verde
          </h1>
          <div className="flex items-center justify-center text-base sm:text-lg font-serif-title">
            <span className="text-emerald-400 font-semibold italic">Totdeauna gata!</span>
          </div>
        </div>
      </section>

      {/* Continut Principal Ramura Verde */}
      <section className="p-7 sm:p-10 rounded-2xl bg-[#0c1017] border border-slate-800 shadow-xl space-y-8">
        <p className="text-slate-300 text-base sm:text-lg leading-relaxed font-light">
          Ramura verde este constituită din cercetașe și cercetași şi se adresează tinerilor cu vârsta cuprinsă între <span className="text-white font-semibold">12 şi 17 ani</span>.
        </p>

        {/* Cele 5 Dimensiuni */}
        <div className="space-y-3.5">
          <h2 className="text-sm uppercase tracking-widest font-bold text-slate-400">
            Cele cinci dimensiuni care definesc cadrul jocului cercetăşesc:
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {dimensions.map((dim) => {
              const Icon = dim.icon;
              return (
                <div
                  key={dim.title}
                  className={`p-4 rounded-xl border ${dim.bg} space-y-1.5 transition-all`}
                >
                  <div className="flex items-center gap-2">
                    <Icon className={`w-4 h-4 ${dim.color}`} />
                    <h3 className="text-sm font-bold text-white font-serif-title">
                      {dim.title}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 font-light leading-relaxed">
                    {dim.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Patrula și Trupa */}
        <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3.5">
          <div className="flex items-center gap-2.5">
            <Compass className="w-5 h-5 text-emerald-400 shrink-0" />
            <h3 className="text-base sm:text-lg font-bold text-white font-serif-title">
              Patrula și Trupa
            </h3>
          </div>

          <div className="space-y-3 text-slate-300 text-sm sm:text-base leading-relaxed font-light">
            <p>
              <strong className="text-white font-semibold">Patrula</strong> este formată din 5-8 membri, are un Șef și un Asistent de Patrulă, un steag, un strigăt şi un caiet de aur în care sunt notate amintirile patrulei de la activitățile la care participă.
            </p>
            <p>
              În momentul în care într-un grup există două sau mai multe patrule, se formează o <strong className="text-white font-semibold">trupă</strong> care este condusă la rândul ei de un Șef de Trupă ajutat de doi sau mai mulți asistenți.
            </p>
          </div>
        </div>

        {/* Link Site Patrulă */}
        <div className="pt-2 flex justify-center">
          <a
            href="https://sites.google.com/view/patrulacormoran/patrula-cormo"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 active:scale-95 border border-emerald-500/70 text-white font-bold text-sm sm:text-base tracking-wide shadow-lg shadow-emerald-950/80 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 text-center group"
          >
            <span>Vezi site-ul patrulei</span>
            <ExternalLink className="w-4 h-4 text-emerald-300 group-hover:translate-x-0.5 transition-transform" />
          </a>
        </div>
      </section>
    </div>
  );
};
