import React from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { MapPin, Hammer } from 'lucide-react';

const GOOGLE_MAPS_API_KEY =
  (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) ||
  'AIzaSyDNmwocPiGw6LK3UTKXCjG5QyAqtLZGv-w';

// Cluj-Napoca center coordinates
const CLUJ_NAPOCA_CENTER = {
  lat: 46.7712,
  lng: 23.6236,
};

export const ProgressPage: React.FC = () => {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Status Notice: "Secțiune în lucru" */}
      <div className="p-4 sm:p-5 rounded-3xl bg-[#0c1017] border border-slate-800/90 shadow-xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-950/60 border border-amber-700/50 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
            <Hammer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white font-serif-title tracking-tight">
              Secțiune în lucru
            </h1>
            <p className="text-xs text-slate-400">
              Progresul patrulei și etapele de dezvoltare vor fi disponibile curând.
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-medium text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>Cluj-Napoca</span>
        </div>
      </div>

      {/* Integrated Google Map of Cluj-Napoca */}
      <div className="rounded-3xl overflow-hidden border border-slate-800/90 bg-[#0c1017] shadow-2xl relative">
        <div className="px-5 py-3.5 border-b border-slate-800/80 bg-[#0e131d]/90 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-emerald-400" />
            <span className="text-xs sm:text-sm font-semibold text-slate-200">
              Harta Cluj-Napoca
            </span>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            46.7712° N, 23.6236° E
          </span>
        </div>

        <div className="h-[480px] sm:h-[540px] w-full relative">
          <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
            <Map
              mapId="DEMO_MAP_ID"
              internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
              defaultCenter={CLUJ_NAPOCA_CENTER}
              defaultZoom={13}
              gestureHandling="greedy"
              disableDefaultUI={false}
              className="w-full h-full"
            >
              <AdvancedMarker position={CLUJ_NAPOCA_CENTER} title="Cluj-Napoca - Patrula Cormoran">
                <Pin
                  background="#064e3b"
                  borderColor="#10b981"
                  glyphColor="#34d399"
                  scale={1.15}
                />
              </AdvancedMarker>
            </Map>
          </APIProvider>
        </div>
      </div>
    </div>
  );
};
