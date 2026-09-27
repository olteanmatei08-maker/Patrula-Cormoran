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
import { AboutPage } from './pages/AboutPage';
import { NotificationPromptModal } from './components/NotificationPromptModal';
import { AssistantModal } from './components/AssistantModal';
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
const VALID_TABS: NavTab[] = ['acasa', 'pedagogie', 'calendar', 'resurse', 'despre'];

function getInitialTab(): NavTab {
  if (typeof window === 'undefined') return 'calendar';

  // 1. Check if user already navigated and left off on a tab (restore exactly where they were)
  const saved = localStorage.getItem('cormo_active_tab') as NavTab;
  if (saved && VALID_TABS.includes(saved)) {
    return saved;
  }

  // 2. Check URL hash (e.g. #calendar, #resurse, #despre, #pedagogie)
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
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Handle tab switching with persistent hash, storage, and scroll reset to top
  const handleSelectTab = (tab: NavTab) => {
    setActiveTab(tab);
    localStorage.setItem('cormo_active_tab', tab);
    window.location.hash = tab;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  };

  // Ensure scroll is at the top on every tab switch and on initial mount
  useEffect(() => {
    localStorage.setItem('cormo_active_tab', activeTab);
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [activeTab]);

  // Keep activeTab in sync with browser navigation (back/forward)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '').toLowerCase();
      if (VALID_TABS.includes(hash as NavTab) && hash !== activeTab) {
        setActiveTab(hash as NavTab);
        localStorage.setItem('cormo_active_tab', hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);

  // Initialize theme, notifications, and 1-second background auto-sync
  const isSyncingRef = useRef(false);
  useEffect(() => {
    applyThemeToDOM(getAppTheme());
    const unsubTheme = subscribeToTheme((t) => applyThemeToDOM(t));

    registerServiceWorker();

    // Ensure hash matches initial tab if not already present
    if (!window.location.hash) {
      window.location.hash = activeTab;
    }

    const runGlobalSync = async () => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      try {
        const res = await fetchCalendarEventsWithAutoSync();
        if (res.events && Array.isArray(res.events)) {
          checkAndDispatchEventNotifications(res.events);
        }
      } catch (err) {
        console.warn('Error in background calendar auto-sync:', err);
      } finally {
        isSyncingRef.current = false;
      }
    };

    // Run check on startup
    runGlobalSync();

    // Global background auto-sync every 10 minutes across the entire application
    const syncInterval = setInterval(runGlobalSync, 10 * 60 * 1000);

    // Also run sync when window regains focus or visibility
    const handleFocus = () => runGlobalSync();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    // 1. Listen for notification click messages from Service Worker
    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.tab === 'calendar' || event.data?.type === 'NAVIGATE_TAB') {
        setActiveTab('calendar');
        localStorage.setItem('cormo_active_tab', 'calendar');
      }
    };

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    }

    // 2. Listen for custom window event dispatched on desktop notification clicks
    const handleCustomNavigate = (e: any) => {
      if (e.detail === 'calendar') {
        setActiveTab('calendar');
        localStorage.setItem('cormo_active_tab', 'calendar');
      }
    };
    window.addEventListener('cormo_navigate_tab', handleCustomNavigate);

    return () => {
      unsubTheme();
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
      window.removeEventListener('cormo_navigate_tab', handleCustomNavigate);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleServiceWorkerMessage);
      }
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
        onOpenAssistant={() => setIsAssistantOpen(true)}
      />

      {/* Main Content Area - padded at bottom for the frozen bottom navigation bar */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-6 pb-24">
        {activeTab === 'acasa' && <HomePage />}
        {activeTab === 'pedagogie' && <PedagogyPage />}
        {activeTab === 'calendar' && <CalendarPage />}
        {activeTab === 'resurse' && <ResourcesPage />}
        {activeTab === 'despre' && <AboutPage />}
      </main>

      {/* Frozen Bottom Navigation Bar */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={handleSelectTab}
      />

      {/* Scout Notification Permission Modal (shown on first open) */}
      <NotificationPromptModal />

      {/* Assistant Modal with device persistence & Gemini chat */}
      <AssistantModal
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
      />
    </div>
  );
}
