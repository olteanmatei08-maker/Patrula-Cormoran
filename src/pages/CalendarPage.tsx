import React, { useState, useEffect, useCallback } from 'react';
import { CalendarEvent } from '../types';
import {
  getCachedCalendarEvents,
  fetchCalendarEventsWithAutoSync,
} from '../services/googleCalendar';
import {
  Calendar as CalendarIcon,
  RefreshCw,
  Clock,
  MapPin,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  CloudSun,
  WifiOff,
  Navigation,
  CalendarPlus,
  CheckCircle2,
} from 'lucide-react';
import { WeatherCluj } from '../components/WeatherCluj';
import { checkAndDispatchEventNotifications } from '../services/notificationService';

// Safely parse local date strings without UTC shift
function parseDateSafe(dateStr: string): Date {
  if (dateStr.length === 10 && dateStr.includes('-')) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(dateStr);
}

// Extract exact hours only if set in Calendar. Never guess!
function getEventTimeDisplay(ev: CalendarEvent): string | null {
  if (ev.hasTime === false || !ev.start.includes('T') || ev.start.length === 10) {
    return null;
  }

  try {
    const s = new Date(ev.start);
    if (isNaN(s.getTime())) return null;

    const startH = s.getHours();
    const startM = s.getMinutes();
    const startTimeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

    if (ev.end && ev.end.includes('T')) {
      const e = new Date(ev.end);
      if (!isNaN(e.getTime())) {
        const endH = e.getHours();
        const endM = e.getMinutes();
        const endTimeStr = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
        return `${startTimeStr} - ${endTimeStr}`;
      }
    }
    return startTimeStr;
  } catch {
    return null;
  }
}

// Formatted relative dates (Azi, Mâine, etc.)
function getRelativeDateLabel(dateStr: string): { label: string; isUrgent: boolean } | null {
  const d = parseDateSafe(dateStr);
  if (isNaN(d.getTime())) return null;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const diffTime = startOfTarget.getTime() - startOfToday.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: 'Azi', isUrgent: true };
  if (diffDays === 1) return { label: 'Mâine', isUrgent: true };
  if (diffDays === 2) return { label: 'Poimâine', isUrgent: false };
  if (diffDays > 2 && diffDays <= 7) return { label: `Peste ${diffDays} zile`, isUrgent: false };
  if (diffDays > 7 && diffDays <= 14) return { label: 'Săptămâna viitoare', isUrgent: false };
  if (diffDays < 0) return { label: 'Încheiat', isUrgent: false };
  return null;
}

// Generate direct URL that opens Google Calendar with event prefilled ready to save
function getAddToCalendarUrl(ev: CalendarEvent): string {
  const title = encodeURIComponent(ev.title || 'Eveniment Patrulă');
  const details = encodeURIComponent(ev.description || '');
  const location = encodeURIComponent(ev.location || '');

  const formatGCalDate = (dStr: string) => {
    const d = new Date(dStr);
    return isNaN(d.getTime()) ? '' : d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  };

  const start = formatGCalDate(ev.start);
  const end = formatGCalDate(ev.end || ev.start);

  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}`;
}

export const CalendarPage: React.FC = () => {
  // Real patrol events loaded instantaneously from cache
  const [events, setEvents] = useState<CalendarEvent[]>(getCachedCalendarEvents);
  const [loading, setLoading] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  // Main page mode: 'calendar' or 'meteo'
  const [activeSubTab, setActiveSubTab] = useState<'calendar' | 'meteo'>('calendar');

  // Calendar view mode: 'upcoming' or 'month'
  const [viewMode, setViewMode] = useState<'upcoming' | 'month'>('upcoming');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDate());

  // Function to refresh events directly from the public Google Calendar
  const refreshEvents = useCallback(async (interactive: boolean = false) => {
    if (!navigator.onLine) return;

    try {
      if (interactive) setLoading(true);

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

  // Listen to background updates from anywhere in the app
  useEffect(() => {
    const handleEventsUpdated = (e: any) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setEvents(e.detail);
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

  // Polling every 30 seconds for automatic, real-time sync with Google Calendar
  useEffect(() => {
    if (!isOnline) return;
    const interval = setInterval(() => {
      refreshEvents(false);
    }, 30 * 1000); // 30 seconds
    return () => clearInterval(interval);
  }, [isOnline, refreshEvents]);

  // Also refresh when tab regains focus or visibility (immediate sync when coming back from Google Calendar)
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

  // Filter events into upcoming
  const now = new Date();
  const upcomingEvents = events.filter((ev) => {
    const end = parseDateSafe(ev.end || ev.start);
    return isNaN(end.getTime()) || end >= now;
  });

  // Month grid helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startDay = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const getEventsForDay = (day: number) => {
    const dayDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter((ev) => ev.start.startsWith(dayDateStr));
  };

  const selectedDayEvents = getEventsForDay(selectedDay);
  const selectedDateObj = new Date(year, month, selectedDay);
  const selectedDateFormatted = selectedDateObj.toLocaleDateString('ro-RO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div className="space-y-5 max-w-4xl mx-auto py-2">
      {/* Top Header Card */}
      <section className="p-5 sm:p-6 rounded-3xl bg-[#0c1017] border border-slate-800 shadow-2xl space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-bold text-white uppercase tracking-wider font-serif-title">
              Calendarul Patrulei
            </h1>
            {syncFeedback ? (
              <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold animate-in fade-in duration-200">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{syncFeedback}</span>
              </div>
            ) : (
              <p className="text-xs text-slate-400 font-medium">
                Sincronizat automat la fiecare 30 secunde
              </p>
            )}
          </div>

          {/* Refresh / Sincronizare Button */}
          <button
            type="button"
            onClick={() => refreshEvents(true)}
            disabled={loading || !isOnline}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white transition-all cursor-pointer text-xs font-semibold active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-sm"
            title="Sincronizează acum cele mai noi evenimente din Google Calendar"
            aria-label="Sincronizare calendar"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{loading ? 'Se sincronizează...' : 'Sincronizează'}</span>
          </button>
        </div>

        {/* View Switchers Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-800/80">
          {/* Calendar vs Vremea Sâmbătă */}
          <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveSubTab('calendar')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                activeSubTab === 'calendar'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Evenimente</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSubTab('meteo')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 select-none ${
                activeSubTab === 'meteo'
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CloudSun className="w-3.5 h-3.5" />
              <span>Vremea Sâmbătă</span>
            </button>
          </div>

          {/* Toggle Agenda (Viitoare) vs Lună (Grid) */}
          {activeSubTab === 'calendar' && (
            <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('upcoming')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  viewMode === 'upcoming'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Agendă ({upcomingEvents.length})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('month')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  viewMode === 'month'
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Vedere Lună
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Offline Status Badge */}
      {!isOnline && activeSubTab === 'calendar' && (
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

      {/* METEO PAGE VIEW (SATURDAY ONLY) */}
      {activeSubTab === 'meteo' && <WeatherCluj />}

      {/* CALENDAR PAGE VIEW */}
      {activeSubTab === 'calendar' && (
        <>
          {/* UPCOMING AGENDA VIEW */}
          {viewMode === 'upcoming' && (
            <section className="space-y-4">
              {upcomingEvents.length > 0 ? (
                <div className="space-y-3.5">
                  {upcomingEvents.map((ev) => {
                    const startDate = parseDateSafe(ev.start);
                    const relativeBadge = getRelativeDateLabel(ev.start);
                    const timeDisplay = getEventTimeDisplay(ev);
                    const hasLocation = !!(ev.location && ev.location.trim().length > 0);

                    // Formatted day numbers and names
                    const dayNumber = !isNaN(startDate.getTime()) ? startDate.getDate() : '';
                    const monthShort = !isNaN(startDate.getTime())
                      ? startDate.toLocaleDateString('ro-RO', { month: 'short' }).toUpperCase()
                      : '';
                    const weekdayFull = !isNaN(startDate.getTime())
                      ? startDate.toLocaleDateString('ro-RO', { weekday: 'long' })
                      : '';

                    const mapsUrl = ev.location
                      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}`
                      : null;

                    return (
                      <article
                        key={ev.id}
                        className="p-5 sm:p-6 rounded-3xl bg-[#0c1017] border border-slate-800 hover:border-slate-700 shadow-xl space-y-4 transition-all"
                      >
                        {/* Top row: Date badge, relative label, actions */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            {/* Visual Date Badge */}
                            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shrink-0 shadow-inner">
                              <span className="text-[10px] font-bold tracking-wider text-slate-400 leading-none">
                                {monthShort}
                              </span>
                              <span className="text-xl sm:text-2xl font-black text-white leading-none mt-1">
                                {dayNumber}
                              </span>
                            </div>

                            {/* Title & Weekday */}
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-slate-400 capitalize">
                                  {weekdayFull}
                                </span>
                                {relativeBadge && (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      relativeBadge.isUrgent
                                        ? 'bg-slate-800 text-slate-200 border border-slate-600'
                                        : 'bg-slate-900 text-slate-400 border border-slate-800'
                                    }`}
                                  >
                                    {relativeBadge.label}
                                  </span>
                                )}
                              </div>
                              <h2 className="text-base sm:text-lg font-bold text-white leading-snug">
                                {ev.title}
                              </h2>
                            </div>
                          </div>

                          {/* Action: Add to Personal Calendar & Open Link */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <a
                              href={getAddToCalendarUrl(ev)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                              title="Adaugă direct în calendarul tău personal"
                              aria-label="Adaugă în calendarul personal"
                            >
                              <CalendarPlus className="w-4 h-4 text-slate-400 hover:text-white" />
                            </a>

                            {ev.htmlLink && (
                              <a
                                href={ev.htmlLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                                title="Deschide în Google Calendar"
                                aria-label="Deschide în Google Calendar"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </a>
                            )}
                          </div>
                        </div>

                        {/* Details row: Time & Location */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          {timeDisplay && (
                            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-200">
                              <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-white">{timeDisplay}</span>
                            </div>
                          )}

                          {hasLocation && (
                            <a
                              href={mapsUrl || '#'}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                              title="Deschide locația în Google Maps"
                            >
                              <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span className="truncate max-w-[200px] sm:max-w-xs">{ev.location}</span>
                              <Navigation className="w-3 h-3 text-slate-500 ml-0.5" />
                            </a>
                          )}
                        </div>

                        {/* Description */}
                        {ev.description && (
                          <div className="pt-2 border-t border-slate-800/60">
                            <p className="text-xs sm:text-sm text-slate-300 whitespace-pre-line leading-relaxed font-light">
                              {ev.description}
                            </p>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 px-4 bg-[#0c1017] rounded-3xl border border-slate-800 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mx-auto">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <h3 className="text-base font-bold text-white">Nu există evenimente programate</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Momentan nu sunt trecute activități în calendar. Când vor fi adăugate, vor apărea automat aici.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* MONTH GRID VIEW */}
          {viewMode === 'month' && (
            <section className="space-y-4">
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0c1017] border border-slate-800 shadow-xl space-y-5">
                {/* Month Navigation */}
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold text-white capitalize font-serif-title">
                    {monthName}
                  </h2>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        const prev = new Date(year, month - 1, 1);
                        setCurrentDate(prev);
                        setSelectedDay(1);
                      }}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title="Luna precedentă"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = new Date(year, month + 1, 1);
                        setCurrentDate(next);
                        setSelectedDay(1);
                      }}
                      className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white cursor-pointer transition-colors"
                      title="Luna următoare"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Weekdays header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400">
                  <span>L</span>
                  <span>M</span>
                  <span>M</span>
                  <span>J</span>
                  <span>V</span>
                  <span className="text-emerald-400">S</span>
                  <span className="text-emerald-400">D</span>
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1.5">
                  {/* Empty cells before startDay */}
                  {Array.from({ length: startDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="h-10 sm:h-12 rounded-xl bg-slate-900/20" />
                  ))}

                  {/* Day cells */}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const dayEvents = getEventsForDay(day);
                    const isSelected = selectedDay === day;
                    const isToday =
                      day === now.getDate() &&
                      month === now.getMonth() &&
                      year === now.getFullYear();

                    return (
                      <button
                        type="button"
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`h-10 sm:h-12 rounded-xl text-xs font-semibold relative flex flex-col items-center justify-center transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-emerald-900 border border-emerald-600 text-white shadow-lg'
                            : isToday
                            ? 'bg-slate-800 border border-slate-600 text-white'
                            : 'bg-slate-900/60 hover:bg-slate-800 text-slate-300 border border-slate-800/80'
                        }`}
                      >
                        <span>{day}</span>
                        {dayEvents.length > 0 && (
                          <div className="flex gap-0.5 mt-0.5">
                            {dayEvents.slice(0, 3).map((_, eIdx) => (
                              <span
                                key={eIdx}
                                className={`w-1 h-1 rounded-full ${
                                  isSelected ? 'bg-white' : 'bg-emerald-400'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selected Day Agenda */}
              <div className="p-5 sm:p-6 rounded-3xl bg-[#0c1017] border border-slate-800 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <h3 className="text-sm sm:text-base font-bold text-white capitalize">
                    {selectedDateFormatted}
                  </h3>
                  <span className="text-xs text-slate-400">
                    {selectedDayEvents.length}{' '}
                    {selectedDayEvents.length === 1 ? 'eveniment' : 'evenimente'}
                  </span>
                </div>

                {selectedDayEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDayEvents.map((ev) => {
                      const timeDisplay = getEventTimeDisplay(ev);
                      const hasLocation = !!(ev.location && ev.location.trim().length > 0);

                      return (
                        <div
                          key={ev.id}
                          className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm sm:text-base font-bold text-white">
                              {ev.title}
                            </h3>
                            <div className="flex items-center gap-1 shrink-0">
                              <a
                                href={getAddToCalendarUrl(ev)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                                title="Adaugă direct în calendarul tău personal"
                                aria-label="Adaugă în calendarul personal"
                              >
                                <CalendarPlus className="w-3.5 h-3.5 text-slate-400 hover:text-white" />
                              </a>
                              {ev.htmlLink && (
                                <a
                                  href={ev.htmlLink}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-400 hover:text-white p-1"
                                  title="Deschide în Google Calendar"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-3 text-xs">
                            {timeDisplay && (
                              <div className="flex items-center gap-1.5 text-slate-200">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-semibold text-white bg-slate-800 px-2 py-0.5 rounded-lg">
                                  {timeDisplay}
                                </span>
                              </div>
                            )}

                            {hasLocation && (
                              <div className="flex items-center gap-1.5 text-slate-300">
                                <MapPin className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                <span className="truncate max-w-[240px] sm:max-w-md">{ev.location!.trim()}</span>
                              </div>
                            )}
                          </div>

                          {ev.description && (
                            <p className="text-xs text-slate-400 whitespace-pre-line pt-1">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-4 text-center">
                    Niciun eveniment programat pentru această zi.
                  </p>
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
