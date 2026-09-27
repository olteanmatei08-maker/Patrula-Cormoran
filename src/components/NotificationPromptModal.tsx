import React, { useState, useEffect } from 'react';
import { Bell } from 'lucide-react';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  isPromptDismissed,
  setPromptDismissed,
  sendTestNotification,
} from '../services/notificationService';

export const NotificationPromptModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isNotificationSupported()) return;

    const currentPermission = getNotificationPermission();

    // Show prompt on first visit if permission is 'default' and not dismissed
    if (currentPermission === 'default' && !isPromptDismissed()) {
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleEnable = async () => {
    const res = await requestNotificationPermission();
    setPromptDismissed(true);
    setIsOpen(false);

    if (res === 'granted') {
      await sendTestNotification();
    }
  };

  const handleDismiss = () => {
    setPromptDismissed(true);
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#0c1017] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-center">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-32 h-32 bg-emerald-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Scout Bell Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-950/70 border border-emerald-800/60 flex items-center justify-center text-emerald-400 shrink-0 shadow-lg shadow-emerald-950/50">
          <Bell className="w-7 h-7" />
        </div>

        {/* Clear, Minimalist Copy */}
        <div className="space-y-2">
          <h2 className="text-lg sm:text-xl font-bold text-white font-serif-title tracking-tight">
            Activezi notificările despre evenimente?
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed font-light">
            Primești alerte directe pe telefon pentru adunări, activități și detalii actualizate din calendar.
          </p>
        </div>

        {/* Clean, aerisit buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-1">
          <button
            onClick={handleEnable}
            className="w-full py-3 px-5 rounded-2xl bg-emerald-800 hover:bg-emerald-700 border border-emerald-600/50 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-emerald-950/80 cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <span>Activează</span>
          </button>

          <button
            onClick={handleDismiss}
            className="w-full py-3 px-5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-all cursor-pointer"
          >
            Mai târziu
          </button>
        </div>
      </div>
    </div>
  );
};
