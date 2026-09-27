/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { BottomNav, NavTab } from './components/BottomNav';
import { HomePage } from './pages/HomePage';
import { PedagogyPage } from './pages/PedagogyPage';
import { CalendarPage } from './pages/CalendarPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { ProgressPage } from './pages/ProgressPage';
import { AboutPage } from './pages/AboutPage';
import { NotificationPromptModal } from './components/NotificationPromptModal';
import {
  registerServiceWorker,
  checkAndDispatchEventNotifications,
} from './services/notificationService';
import { fetchCalendarEventsWithAutoSync } from './services/googleCalendar';
import {
  getAppTheme,
  applyThemeToDOM,
  subscribeToTheme,
} from './services/themeService';
import { CalendarEvent } from './types';

const EVENTS_CACHE_KEY = 'cormo_patrol_events_cache';
const VALID_TABS: NavTab[] = ['acasa', 'pedagogie', 'calendar', 'resurse', 'progres', 'despre'];

function getInitialTab(): NavTab {
  if (typeof window === 'undefined') return 'calendar';

  // 1. Check if user already navigated and left off on a tab (restore exactly where they were)
  const saved = localStorage.getItem('cormo_active_tab') as NavTab;
  if (saved && VALID_TABS.includes(saved)) {
    return saved;
  }

  // 2. Check URL hash (e.g. #calendar, #resurse, #despre, #pedagogie, #progres)
  const hash = window.location.hash.replace('#', '').toLowerCase();
  if (VALID_TABS.includes(hash as NavTab)) {
    return hash as NavTab;
  }

  // 3. Check query param ?tab=...
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get('tab')?.toLowerCase();
  if (tabParam && VALID_TABS.includes(tabParam as NavTab)) {
    return tabParam as NavTab;
  }

  // 4. First time ever opening the app: Default directly to 'calendar'!
  return 'calendar';
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>(getInitialTab);

  // Handle tab switching with persistent hash, storage, and scroll reset to top
  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    localStorage.setItem('cormo_active_tab', tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync hash changes (e.g. browser back/forward buttons)
  useEffect(() => {
    const handleHashChange = () => {
      const h = window.location.hash.replace('#', '').toLowerCase();
      if (VALID_TABS.includes(h as NavTab)) {
        setActiveTab(h as NavTab);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Set initial theme and subscribe to changes
  useEffect(() => {
    applyThemeToDOM(getAppTheme());
    const unsubscribe = subscribeToTheme((theme) => {
      applyThemeToDOM(theme);
    });
    return unsubscribe;
  }, []);

  // Register service worker for PWA & push notifications
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Notification and sync interval ref
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Background calendar sync & notification dispatcher
  useEffect(() => {
    // 1. Check cached events immediately on mount
    try {
      const raw = localStorage.getItem(EVENTS_CACHE_KEY);
      if (raw) {
        const cached: CalendarEvent[] = JSON.parse(raw);
        if (Array.isArray(cached) && cached.length > 0) {
          checkAndDispatchEventNotifications(cached);
        }
      }
    } catch (err) {
      console.warn('Eroare verificare cache inițial notificări:', err);
    }

    // 2. Fetch fresh events and check notifications
    const performSyncAndNotify = async () => {
      try {
        const result = await fetchCalendarEventsWithAutoSync();
        const events = result?.events;
        if (events && events.length > 0) {
          localStorage.setItem(EVENTS_CACHE_KEY, JSON.stringify(events));
          await checkAndDispatchEventNotifications(events);
        }
      } catch (err) {
        console.warn('Sincronizare fundal calendar eșuată:', err);
      }
    };

    // Initial check after 3 seconds
    const initialTimer = setTimeout(() => {
      performSyncAndNotify();
    }, 3000);

    // Periodic background sync: once every 10 minutes (600,000 ms)
    syncIntervalRef.current = setInterval(performSyncAndNotify, 10 * 60 * 1000);

    // Also check when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSyncAndNotify();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col font-sans selection:bg-emerald-500/30 selection:text-white transition-colors duration-200"
      style={{
        backgroundColor: 'var(--bg-app)',
        color: 'var(--text-main)',
      }}
    >
      {/* Top Header */}
      <Header
        onNavigateToCalendar={() => handleSelectTab('calendar')}
      />

      {/* Main Content Area - padded at bottom for the frozen bottom navigation bar */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        {activeTab === 'acasa' && <HomePage />}
        {activeTab === 'pedagogie' && <PedagogyPage />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'resurse' && <ResourcesPage />}
        {activeTab === 'progres' && <ProgressPage />}
        {activeTab === 'despre' && <AboutPage />}
      </main>

      {/* Frozen Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
      />

      {/* Scout Notification Permission Modal (shown on first open) */}
      <NotificationPromptModal />
    </div>
  );
}
