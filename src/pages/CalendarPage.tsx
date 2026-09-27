import React, { useState, useEffect, useCallback, useRef } from 'react';
import { CalendarEvent } from '../types';
import {
  getCachedCalendarEvents,
  fetchCalendarEventsWithAutoSync,
} from '../services/googleCalendar';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  CloudSun,
  WifiOff,
  CheckCircle2,
} from 'lucide-react';
import { WeatherCluj } from '../components/WeatherCluj';
import { checkAndDispatchEventNotifications } from '../services/notificationService';

export const CalendarPage: React.FC = () => {
  const [, setEvents] = useState<CalendarEvent[]>(getCachedCalendarEvents);
  const [loading, setLoading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [iframeKey, setIframeKey] = useState<number>(Date.now());
  const lastEventsJsonRef = useRef('');

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Main page mode: 'calendar' (Cormo Calendar Oficial) or 'meteo' (Vremea Sâmbătă)
  const [activeTab, setActiveTab] = useState<'calendar' | 'meteo'>('calendar');

  // Function to refresh events directly from the public Google Calendar
  const refreshEvents = useCallback(async (interactive: boolean = false) => {
    if (!navigator.onLine) return;

    try {
      if (interactive) {
        setLoading(true);
        // Force reload the embedded iframe
        setIframeKey(Date.now());
      }

      const res = await fetchCalendarEventsWithAutoSync(interactive);
      if (res.events && Array.isArray(res.events)) {
        setEvents(res.events);
        checkAndDispatchEventNotifications(res.events);
        if (interactive) {
          setSyncFeedback('Sincronizat live');
          setTimeout(() => setSyncFeedback(null), 3000);
        }
      }
    } catch (err) {
      console.warn('Eroare actualizare calendar:', err);
    } finally {
      if (interactive) setLoading(false);
    }
  }, []);

  // Listen to background updates: when events change in Google Calendar, auto-reload iframe
  useEffect(() => {
    const handleEventsUpdated = (e: any) => {
      const detail = e.detail;
      const evList = Array.isArray(detail) ? detail : detail?.events;
      if (Array.isArray(evList) && evList.length > 0) {
        setEvents(evList);
        const json = JSON.stringify(evList);
        // If events changed (new event added or details updated), auto-reload the Google Calendar iframe!
        if (lastEventsJsonRef.current && lastEventsJsonRef.current !== json) {
          setIframeKey(Date.now());
        }
        lastEventsJsonRef.current = json;
      }
    };
    window.addEventListener('cormo_events_updated', handleEventsUpdated);
    return () => window.removeEventListener('cormo_events_updated', handleEventsUpdated);
  }, []);

  // Online / Offline listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshEvents(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshEvents]);

  // Initial refresh on mount
  useEffect(() => {
    refreshEvents(false);
  }, [refreshEvents]);

  // Polling every 10 minutes (10 * 60 * 1000ms) for background synchronization
  const isPollingRef = useRef(false);
  useEffect(() => {
    if (!isOnline) return;

    const interval = setInterval(async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;
      try {
        await refreshEvents(false);
      } finally {
        isPollingRef.current = false;
      }
    }, 10 * 60 * 1000); // 10-minute auto-sync interval

    return () => clearInterval(interval);
  }, [isOnline, refreshEvents]);

  // Also refresh when tab regains focus or visibility
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshEvents(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [refreshEvents]);

  // Embedded URL in Schedule / Program format (mode=AGENDA), week starts on Monday (wkst=2), Romanian language (hl=ro)
  const embedUrl = `https://calendar.google.com/calendar/embed?src=olteanmatei08%40gmail.com&ctz=Europe%2FBucharest&mode=AGENDA&wkst=2&hl=ro&showTitle=0&showNav=1&showDate=1&showPrint=0&showTabs=1&showCalendars=0&showTz=1&bgcolor=%230c1017`;

  return (
    <div className="space-y-5 max-w-5xl mx-auto py-2">
      {/* Top Header Card */}
      <section className="p-5 sm:p-6 rounded-3xl bg-[#0c1017] border border-slate-800 shadow-2xl space-y-4">
        {/* Title row */}
        <div className="space-y-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wider font-serif-title">
            Calendarul Patrulei
          </h1>

          {/* Sincronizare Button placed directly UNDER the title */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              type="button"
              onClick={() => refreshEvents(true)}
              disabled={loading || !isOnline}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white transition-all cursor-pointer text-xs font-semibold active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
              title="Sincronizează acum datele și reîncarcă calendarul"
              aria-label="Sincronizare calendar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
              <span>{loading ? 'Se sincronizează...' : 'Sincronizează'}</span>
            </button>

            {syncFeedback && (
              <div className="flex items-center justify-center gap-1.5 text-xs text-emerald-400 font-semibold animate-in fade-in duration-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{syncFeedback}</span>
              </div>
            )}
          </div>
        </div>

        {/* View Switchers: 'Vremea Sâmbătă' under 'Cormo Calendar Oficial', both full width */}
        <div className="flex flex-col gap-2.5 w-full pt-3 border-t border-slate-800/80">
          {/* 1. Cormo Calendar Oficial - Full width */}
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 select-none text-sm ${
              activeTab === 'calendar'
                ? 'bg-slate-800 text-white shadow-lg border border-slate-600 ring-1 ring-emerald-500/30'
                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900'
            }`}
          >
            <CalendarIcon className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Cormo Calendar Oficial</span>
          </button>

          {/* 2. Vremea Sâmbătă - placed under Cormo Calendar Oficial, full width */}
          <button
            type="button"
            onClick={() => setActiveTab('meteo')}
            className={`w-full py-3.5 px-4 rounded-2xl font-bold transition-all cursor-pointer flex items-center justify-center gap-2.5 select-none text-sm ${
              activeTab === 'meteo'
                ? 'bg-slate-800 text-white shadow-lg border border-slate-600 ring-1 ring-amber-500/30'
                : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-slate-800 hover:bg-slate-900'
            }`}
          >
            <CloudSun className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Vremea Sâmbătă</span>
          </button>
        </div>
      </section>

      {/* Offline Status Badge */}
      {!isOnline && activeTab !== 'meteo' && (
        <div className="p-3.5 bg-amber-950/40 border border-amber-800/60 rounded-2xl text-amber-200 text-xs flex items-center justify-between gap-3 shadow-md">
          <div className="flex items-center gap-2">
            <WifiOff className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Mod offline activ: Evenimentele sunt încărcate instantaneu din memoria locală a telefonului.</span>
          </div>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-900/60 text-amber-300 shrink-0">
            Offline
          </span>
        </div>
      )}

      {/* 1. CORMO CALENDAR OFICIAL (DARK MODE + SCHEDULE / PROGRAM MODE + MONDAY FIRST DAY) */}
      {activeTab === 'calendar' && (
        <section className="p-2 sm:p-3 rounded-3xl bg-[#0c1017] border border-slate-800 shadow-2xl overflow-hidden">
          <div className="w-full rounded-2xl overflow-hidden bg-[#121620] relative min-h-[580px] sm:min-h-[680px]">
            <iframe
              key={iframeKey}
              src={embedUrl}
              style={{
                border: 0,
                filter: 'invert(0.92) hue-rotate(180deg) brightness(0.95) contrast(1.08)',
              }}
              width="100%"
              height="680"
              frameBorder="0"
              scrolling="no"
              title="Cormo Calendar Oficial"
              className="w-full h-[580px] sm:h-[680px] block rounded-2xl transition-opacity duration-300"
            />
          </div>
        </section>
      )}

      {/* 2. VREMEA SÂMBĂTĂ VIEW */}
      {activeTab === 'meteo' && <WeatherCluj />}
    </div>
  );
};
