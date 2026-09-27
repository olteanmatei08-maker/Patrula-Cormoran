import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = Number(process.env.PORT) || 3000;

app.use(express.json({ limit: '10mb' }));

// Data storage paths
const DATA_DIR = path.resolve(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const EVENTS_FILE = path.join(DATA_DIR, 'calendar_events.json');
const RESOURCES_FILE = path.join(DATA_DIR, 'drive_resources.json');

// Helper to safely read JSON file
function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`Error reading ${filePath}:`, err);
  }
  return fallback;
}

// Helper to safely write JSON file
function writeJsonFile<T>(filePath: string, data: T): boolean {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

// Helper function to categorize events
function categorizeEvent(summary = '', description = '') {
  const lower = `${summary} ${description}`.toLowerCase();
  if (lower.includes('vlădeasa') || lower.includes('vladeasa') || lower.includes('munte') || lower.includes('drumeție') || lower.includes('hike')) {
    return 'drumetie';
  } else if (lower.includes('camp') || lower.includes('tabără') || lower.includes('tabara') || lower.includes('cort')) {
    return 'campism';
  } else if (lower.includes('tehnic') || lower.includes('nod') || lower.includes('morse') || lower.includes('prim ajutor')) {
    return 'tehnici';
  } else if (lower.includes('ecolog') || lower.includes('curățenie') || lower.includes('curatenie') || lower.includes('pădure') || lower.includes('copaci')) {
    return 'ecologie';
  } else if (lower.includes('promisiune') || lower.includes('aniversare') || lower.includes('ceremonie')) {
    return 'ceremonie';
  }
  return 'adunare';
}

function parseICalDate(dStr: string): { dateStr: string; hasTime: boolean } {
  if (!dStr) return { dateStr: '', hasTime: false };
  const clean = dStr.replace(/[^0-9TZ]/g, '');
  if (clean.length === 8) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    return { dateStr: `${y}-${m}-${d}`, hasTime: false };
  }
  if (clean.length >= 15) {
    const y = clean.substring(0, 4);
    const m = clean.substring(4, 6);
    const d = clean.substring(6, 8);
    const h = clean.substring(9, 11);
    const min = clean.substring(11, 13);
    const s = clean.substring(13, 15);
    const isUtc = clean.endsWith('Z');
    const iso = `${y}-${m}-${d}T${h}:${min}:${s}${isUtc ? 'Z' : ''}`;
    return { dateStr: iso, hasTime: true };
  }
  return { dateStr: dStr, hasTime: false };
}

function parseICal(ics: string) {
  const events = [];
  const entries = ics.split(/BEGIN:VEVENT\r?\n/);
  for (let i = 1; i < entries.length; i++) {
    const block = entries[i].split(/END:VEVENT/)[0];
    const getField = (name: string) => {
      const match = block.match(new RegExp(`(?:^|\\r?\\n)${name}(?:;[^:]*)?:(.*)(?:\\r?\\n|$)`));
      return match ? match[1].trim().replace(/\\,/g, ',').replace(/\\n/g, '\n').replace(/\\;/g, ';') : '';
    };

    const uid = getField('UID') || `ical-${i}-${Date.now()}`;
    const summary = getField('SUMMARY') || 'Eveniment Patrulă';
    const description = getField('DESCRIPTION');
    const location = getField('LOCATION');
    const dtstartRaw = getField('DTSTART');
    const dtendRaw = getField('DTEND') || dtstartRaw;

    const startParsed = parseICalDate(dtstartRaw);
    const endParsed = parseICalDate(dtendRaw);

    if (startParsed.dateStr) {
      events.push({
        id: uid,
        title: summary,
        description: description || undefined,
        location: location || undefined,
        start: startParsed.dateStr,
        end: endParsed.dateStr || startParsed.dateStr,
        hasTime: startParsed.hasTime,
        category: categorizeEvent(summary, description),
      });
    }
  }
  return events;
}

const GOOGLE_CALENDAR_API_KEY = process.env.GOOGLE_CALENDAR_API_KEY || 'AIzaSyAAYnHYz7FZ1INDbjGNdt_Ttt7c4fMEnkw';

let lastCalendarFetchTime = 0;
let cachedCalendarEvents: any[] = [];
let activeFetchPromise: Promise<any[]> | null = null;

async function fetchLiveGoogleCalendarEvents(calendarId: string, force: boolean = false): Promise<any[]> {
  const now = Date.now();
  // 1-second throttle for real-time polling synchronization
  if (!force && cachedCalendarEvents.length > 0 && now - lastCalendarFetchTime < 1000) {
    return cachedCalendarEvents;
  }

  if (activeFetchPromise) {
    return activeFetchPromise;
  }

  activeFetchPromise = (async () => {
    try {
      // 1. Try Google Calendar REST API v3 with user provided API Key
      try {
        const timeMin = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const apiUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events?key=${GOOGLE_CALENDAR_API_KEY}&singleEvents=true&orderBy=startTime&timeMin=${encodeURIComponent(
          timeMin
        )}&maxResults=100`;

        const apiRes = await fetch(apiUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(4000),
        });

        if (apiRes.ok) {
          const data = await apiRes.json();
          if (Array.isArray(data.items)) {
            const events = data.items.map((item: any) => {
              const hasTime = !!item.start?.dateTime;
              const start = item.start?.dateTime || item.start?.date || new Date().toISOString();
              const end = item.end?.dateTime || item.end?.date || start;
              return {
                id: item.id,
                title: item.summary || 'Eveniment Patrulă',
                description: item.description || undefined,
                location: item.location || undefined,
                start,
                end,
                hasTime,
                category: categorizeEvent(item.summary, item.description),
                htmlLink: item.htmlLink,
              };
            });

            if (events.length > 0) {
              cachedCalendarEvents = events;
              lastCalendarFetchTime = Date.now();
              writeJsonFile(EVENTS_FILE, events);
              return events;
            }
          }
        }
      } catch (err: any) {
        // Fallback to iCal feed
      }

      // 2. Fetch live public iCal feed (always works for public calendars, instant and unrestricted)
      try {
        const icsUrl = `https://calendar.google.com/calendar/ical/${encodeURIComponent(
          calendarId
        )}/public/basic.ics?_t=${Date.now()}`;

        const icsRes = await fetch(icsUrl, {
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) PatrulaCormoran/1.0',
          },
          signal: AbortSignal.timeout(5000),
        });

        if (icsRes.ok) {
          const icsText = await icsRes.text();
          // Unfold multi-line entries per RFC 5545
          const unfolded = icsText.replace(/\r?\n[ \t]/g, '');
          const entries = unfolded.split(/BEGIN:VEVENT\r?\n/);
          const events: any[] = [];

          for (let i = 1; i < entries.length; i++) {
            const block = entries[i].split(/END:VEVENT/)[0];
            const getField = (name: string) => {
              const match = block.match(new RegExp(`(?:^|\\r?\\n)${name}(?:;[^:]*)?:(.*)(?:\\r?\\n|$)`));
              return match
                ? match[1].trim().replace(/\\\\/g, '\\').replace(/\\,/g, ',').replace(/\\n/g, '\n').replace(/\\;/g, ';')
                : '';
            };

            const parseDate = (dStr: string) => {
              if (!dStr) return { dateStr: '', hasTime: false };
              const clean = dStr.replace(/[^0-9TZ]/g, '');
              if (clean.length === 8) {
                const y = clean.substring(0, 4);
                const m = clean.substring(4, 6);
                const d = clean.substring(6, 8);
                return { dateStr: `${y}-${m}-${d}`, hasTime: false };
              }
              if (clean.length >= 15) {
                const y = clean.substring(0, 4);
                const m = clean.substring(4, 6);
                const d = clean.substring(6, 8);
                const h = clean.substring(9, 11);
                const min = clean.substring(11, 13);
                const s = clean.substring(13, 15);
                const isUtc = clean.endsWith('Z');
                const iso = isUtc
                  ? new Date(Date.UTC(+y, +m - 1, +d, +h, +min, +s)).toISOString()
                  : `${y}-${m}-${d}T${h}:${min}:${s}`;
                return { dateStr: iso, hasTime: true };
              }
              return { dateStr: dStr, hasTime: false };
            };

            const rawUid = getField('UID');
            const id = rawUid.split('@')[0] || rawUid || `ev-${i}`;
            const summary = getField('SUMMARY') || 'Eveniment Patrulă';
            const description = getField('DESCRIPTION');
            const location = getField('LOCATION');
            const dtstart = getField('DTSTART');
            const dtend = getField('DTEND') || dtstart;

            const startP = parseDate(dtstart);
            const endP = parseDate(dtend);

            if (startP.dateStr) {
              const eid = Buffer.from(`${id} ${calendarId}`).toString('base64');
              events.push({
                id,
                title: summary,
                description: description || undefined,
                location: location || undefined,
                start: startP.dateStr,
                end: endP.dateStr || startP.dateStr,
                hasTime: startP.hasTime,
                category: categorizeEvent(summary, description),
                htmlLink: `https://www.google.com/calendar/event?eid=${eid}`,
              });
            }
          }

          if (events.length > 0) {
            cachedCalendarEvents = events;
            lastCalendarFetchTime = Date.now();
            writeJsonFile(EVENTS_FILE, events);
            return events;
          }
        }
      } catch (err: any) {
        console.warn('Public iCal fetch note:', err?.message);
      }

      // 3. Fallback to persisted cache if network is temporarily unreachable
      const stored = readJsonFile<any[]>(EVENTS_FILE, []);
      if (stored.length > 0) {
        cachedCalendarEvents = stored;
        return stored;
      }

      return cachedCalendarEvents;
    } finally {
      activeFetchPromise = null;
    }
  })();

  return activeFetchPromise;
}

// 1. GET CALENDAR EVENTS:
// Returns permanently persisted real events for any phone/device with fast auto-sync!
app.get('/api/calendar/events', async (req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  try {
    const force = req.query.force === 'true';
    const calendarId = process.env.GOOGLE_CALENDAR_ID || 'olteanmatei08@gmail.com';
    const events = await fetchLiveGoogleCalendarEvents(calendarId, force);
    return res.json({ events, source: 'live', timestamp: Date.now() });
  } catch (err: any) {
    console.error('Calendar server endpoint error:', err);
    const stored = readJsonFile<any[]>(EVENTS_FILE, []);
    return res.json({ events: stored, source: 'persisted', error: err?.message });
  }
});

// 2. POST CALENDAR SYNC:
// Receives imported real events from Google Calendar API and persists them permanently for all devices!
app.post('/api/calendar/sync', (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Array-ul de evenimente este invalid.' });
    }

    // Filter out any dummy or demo events
    const cleanEvents = events.filter((ev: any) => {
      const id = String(ev.id || '');
      return !id.startsWith('cormo-event-') && !id.startsWith('demo-');
    });

    writeJsonFile(EVENTS_FILE, cleanEvents);
    console.log(`[Google Sync] Salvate ${cleanEvents.length} evenimente reale din calendar.`);
    return res.json({ success: true, count: cleanEvents.length, events: cleanEvents });
  } catch (err: any) {
    console.error('Eroare salvare evenimente:', err);
    return res.status(500).json({ error: err?.message || 'Eroare server la sincronizare' });
  }
});

// GET ICS FOR SINGLE EVENT (NATIVE DEVICE CALENDAR IMPORT)
app.get('/api/calendar/event/:id/ics', (req, res) => {
  try {
    const { id } = req.params;
    const storedEvents = readJsonFile<any[]>(EVENTS_FILE, []);
    const event = storedEvents.find((e) => e.id === id);
    if (!event) {
      return res.status(404).send('Evenimentul nu a fost găsit');
    }

    const formatIcsDate = (dStr: string) => {
      const d = new Date(dStr);
      return isNaN(d.getTime()) ? '' : d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const start = formatIcsDate(event.start);
    const end = formatIcsDate(event.end || event.start);

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Patrula Cormoran//RO',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id}@patrulacormoran.ro`,
      `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
      `DTSTART:${start}`,
      `DTEND:${end}`,
      `SUMMARY:${event.title || 'Eveniment Patrulă'}`,
      event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
      event.location ? `LOCATION:${event.location}` : '',
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].filter(Boolean).join('\r\n');

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${encodeURIComponent(event.title || 'eveniment')}.ics"`,
      'Cache-Control': 'no-cache',
    });
    return res.send(icsContent);
  } catch (err: any) {
    return res.status(500).send('Eroare generare calendar');
  }
});

// Helper to fetch Google Drive folder files
async function fetchDriveFolderFiles(folderId: string, apiKey: string) {
  // 1. First try Google Drive API v3
  try {
    const q = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
    const apiUrl = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,webViewLink,webContentLink,size,modifiedTime)&key=${apiKey}`;
    const res = await fetch(apiUrl, { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.files)) {
        return data.files.map((f: any) => ({
          id: f.id,
          name: f.name,
          mimeType: f.mimeType || 'application/octet-stream',
          webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
          directViewLink: `https://drive.google.com/file/d/${f.id}/preview`,
          downloadUrl: `https://drive.google.com/uc?export=download&id=${f.id}`,
          size: f.size ? formatBytes(Number(f.size)) : undefined,
          modifiedTime: f.modifiedTime,
        }));
      }
    }
  } catch (err: any) {
    console.warn('Drive API direct request failed:', err?.message);
  }

  // 2. Fetch public HTML view of folder
  try {
    const folderUrl = `https://drive.google.com/drive/folders/${folderId}`;
    const res = await fetch(folderUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const html = await res.text();
      const callbacks = html.match(/AF_initDataCallback\(\{.*?\}\);/gs) || [];
      const files: any[] = [];

      for (const cb of callbacks) {
        const jsonMatch = cb.match(/data:\s*(\[.*?\])\s*,\s*sideChannel:/s);
        if (!jsonMatch) continue;
        try {
          const parsed = JSON.parse(jsonMatch[1]);
          function searchNodes(node: any) {
            if (!node || !Array.isArray(node)) return;
            let fileId: string | null = null;
            let fileName: string | null = null;
            let mimeType: string | null = null;
            let size: string | null = null;

            function extractFromItem(n: any) {
              if (!n || !Array.isArray(n)) return;
              if (n[1] === 'Download' && Array.isArray(n[5]) && n[5][0] && typeof n[5][0][1] === 'string') {
                fileId = n[5][0][1];
              }
              if (Array.isArray(n) && typeof n[0] === 'string' && n[0].includes('application/')) {
                mimeType = n[0];
              }
              if (n[0] === 16 && Array.isArray(n[2])) {
                const possibleName = n[2]?.[1]?.[0]?.[0]?.[0];
                if (typeof possibleName === 'string' && possibleName.length > 0) {
                  fileName = possibleName;
                }
              }
              if (n[0] === 1 && Array.isArray(n[2])) {
                const possibleSize = n[2]?.[1]?.[0]?.[0]?.[0];
                if (typeof possibleSize === 'string') size = possibleSize;
              }
              n.forEach(extractFromItem);
            }

            extractFromItem(node);
            if (fileId && fileName && !files.some((f) => f.id === fileId)) {
              files.push({
                id: fileId,
                name: fileName,
                mimeType: mimeType || 'application/pdf',
                size: size || undefined,
                webViewLink: `https://drive.google.com/file/d/${fileId}/view`,
                directViewLink: `https://drive.google.com/file/d/${fileId}/preview`,
                downloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
              });
            }
            node.forEach(searchNodes);
          }
          searchNodes(parsed);
        } catch {
          // Ignore parse errors on individual callbacks
        }
      }

      if (files.length > 0) {
        return files.reverse();
      }
    }
  } catch (err: any) {
    console.warn('Folder HTML scraping error:', err?.message);
  }

  return [];
}

function formatBytes(bytes: number) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// 3. GET DRIVE RESOURCES (LIVE FOLDER SYNC):
// Interoghează live dosarul Google Drive 1qwQBgPB3vuCzWi6aor2t8OMZHEExzuXJ
app.get('/api/drive/files', async (_req, res) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  const folderId = '1qwQBgPB3vuCzWi6aor2t8OMZHEExzuXJ';
  const apiKey = process.env.GOOGLE_API_KEY || 'AIzaSyAAYnHYz7FZ1INDbjGNdt_Ttt7c4fMEnkw';

  try {
    const liveFiles = await fetchDriveFolderFiles(folderId, apiKey);
    if (liveFiles.length > 0) {
      writeJsonFile(RESOURCES_FILE, liveFiles);
      return res.json({ files: liveFiles, source: 'live', timestamp: Date.now() });
    }

    // Fallback to persisted file if live fetch had temporary network timeout
    const stored = readJsonFile<any[]>(RESOURCES_FILE, []);
    return res.json({ files: stored, source: 'persisted', timestamp: Date.now() });
  } catch (err: any) {
    console.error('Eroare /api/drive/files:', err);
    const stored = readJsonFile<any[]>(RESOURCES_FILE, []);
    return res.json({ files: stored, source: 'persisted', error: err?.message });
  }
});

// 4. GET DRIVE RESOURCES:
// Returns permanently persisted real Google Drive files for all devices!
app.get('/api/resources', (_req, res) => {
  try {
    const stored = readJsonFile<any[]>(RESOURCES_FILE, []);
    return res.json({ resources: stored });
  } catch (err: any) {
    console.error('Eroare citire resurse:', err);
    return res.status(500).json({ error: err?.message || 'Eroare citire resurse' });
  }
});

// 4. POST DRIVE RESOURCES SYNC:
// Receives imported real Google Drive files and persists them permanently!
app.post('/api/resources/sync', (req, res) => {
  try {
    const { resources } = req.body;
    if (!Array.isArray(resources)) {
      return res.status(400).json({ error: 'Array-ul de resurse este invalid.' });
    }

    // Filter out sample/dummy files
    const cleanResources = resources.filter((r: any) => {
      const url = String(r.driveUrl || '');
      const id = String(r.id || '');
      return !url.includes('1sample-') && !id.startsWith('res-1') && !id.startsWith('res-2') && !id.startsWith('res-3');
    });

    writeJsonFile(RESOURCES_FILE, cleanResources);
    console.log(`[Google Sync] Salvate ${cleanResources.length} resurse reale din Google Drive.`);
    return res.json({ success: true, count: cleanResources.length, resources: cleanResources });
  } catch (err: any) {
    console.error('Eroare salvare resurse:', err);
    return res.status(500).json({ error: err?.message || 'Eroare server la salvare resurse' });
  }
});

// Chat endpoint for Patrula Cormoran Assistant
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { messages, userSystemInstruction } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY lipsește din variabilele de mediu.' });
    }

    const ai = new GoogleGenAI({ apiKey });
    const selectedModel = 'gemini-3.8-flash';

    // Build real-time calendar context from live events
    const currentEvents =
      cachedCalendarEvents.length > 0 ? cachedCalendarEvents : readJsonFile<any[]>(EVENTS_FILE, []);
    const eventsSummary = currentEvents
      .map((e: any) => {
        return `- Titlu: „${e.title}” | Început: ${e.start} | Sfârșit: ${e.end || e.start} | Oră stabilită: ${
          e.hasTime ? 'Da' : 'Nu (toată ziua)'
        } | Locație: ${e.location || 'Nestabilită'} | Descriere: ${e.description || '-'}`;
      })
      .join('\n');

    const todayStr = new Date().toLocaleDateString('ro-RO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const nowTimeStr = new Date().toLocaleTimeString('ro-RO', { hour: '2-digit', minute: '2-digit' });

    const systemInstruction = `Ești un asistent inteligent, prietenos, educat și prompt integrat în aplicația Patrulei Cormoran.
Vorbește natural ca un asistent personal. NU te da drept "Cormo Asistent", "Cormo" sau alte denumiri asemănătoare; vorbește direct și politicos ca un asistent.

Capabilități și cunoștințe:
1. Poți răspunde la ORICE întrebare, nu neapărat legată de cercetășie (cultură generală, știință, natură, matematică, logică, istorie, sfaturi practice, etc.). Răspunde complet, clar și structurat în limba română (sau limba în care ești întrebat).
2. Ai cunoștințe aprofundate despre Cercetașii Munților (Asociația Cercetașii Munților - ACM din România, membră a Uniunii Internaționale a Ghizilor și Cercetașilor din Europa - UIGSE-FSE, site: https://cercetasii-muntilor.ro/):
   - Ramuri: Lupişori / Pui de Lup (8-12 ani), Cercetaşi / Ghidușe (12-17 ani), Călăuze / Rătăcitori (17+ ani)
   - Pedagogia catolică a scoutismului european (Baden-Powell, Părintele Jacques Sevin)
   - Legea cercetașului (10 articole), Promisiunea, Principiile, cele 5 scopuri ale cercetășiei (Sănătatea, Simțul practic, Caracterul, Serviciul, Simțul lui Dumnezeu)
   - Viața în natură, tehnici de camp, focuri, noduri, orientare, topografie, prim ajutor, semnalizare, pionierat
   - Sistemul patrulelor (patrula este o echipă autonomă condusă de un Șef de Patrulă, cu roluri specifice: ajutor, trezorier, secretar, infirmier, topograf, intendent etc.)
   - Patrula Cormoran este o patrulă de cercetași băieți din Cluj-Napoca, având tradiție, strigăt de patrulă și caiet de patrulă.
3. INFORMAȚII ÎN TIMP REAL DESPRE EVENIMENTE ȘI CALENDAR:
   - Data și ora curentă: ${todayStr}, ora ${nowTimeStr}.
   - Evenimente programate în calendarul patrulei:
${eventsSummary || 'Momentan nu sunt evenimente înregistrate în calendar.'}

Reguli la întrebări legate de calendar și evenimente:
- Răspunde structurat, concis, direct și natural.
- Când utilizatorul întreabă despre evenimente (de exemplu „ce evenimente avem?”, „ce activități sunt?”), menționează direct și curat doar numele evenimentelor (de exemplu: „Următoarele evenimente sunt: **Ieșire patrulă**, **Ieșire de trupă**...”). NU genera liste lungi și încărcate cu puncte, sub-puncte, ore și locații repetitive pentru fiecare eveniment decât dacă utilizatorul solicită expres acest nivel de detaliu.
- Dacă utilizatorul întreabă punctual despre data, ora sau locul unui anumit eveniment, oferă direct acea informație.
- Dacă utilizatorul întreabă dacă o anumită zi este "liberă", verifică calendarul și spune clar dacă ziua este liberă sau ce eveniment are loc atunci.
- Păstrează răspunsurile compacte, clare, fără introduceri sau formule de încheiere inutile.

Formatare:
- Folosește formatare curată (liste cu puncte, text bold pentru date și nume) și un ton cald, politicos, concis și profesionist.
${userSystemInstruction ? `\nInstrucțiuni adiționale: ${userSystemInstruction}` : ''}`;

    const contents = (messages || []).map((m: { role: string; content: string }) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents,
        config: { systemInstruction },
      });
      return res.json({ reply: response.text || '' });
    } catch (primaryErr: any) {
      console.warn('Primary model gemini-3.8-flash error, trying fallback gemini-flash-latest:', primaryErr?.message);
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents,
        config: { systemInstruction },
      });
      return res.json({ reply: fallbackResponse.text || '' });
    }
  } catch (err: any) {
    console.error('Gemini server error:', err);
    return res.status(500).json({ error: err?.message || 'A apărut o eroare la procesarea cererii către asistent.' });
  }
});

// Vite middleware in dev or static files in production
if (process.env.NODE_ENV !== 'production') {
  const { createServer: createViteServer } = await import('vite');
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

app.listen(port, '0.0.0.0', () => {
  console.log(`Server Cormo pornit pe http://0.0.0.0:${port}`);
});
