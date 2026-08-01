const express = require('express');
const cors    = require('cors');
const fs      = require('fs');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── CORS: allow denticsdentalcare.in and localhost for dev ──
app.use(cors({
  origin: [
    'https://denticsdentalcare.in',
    'https://www.denticsdentalcare.in',
    'http://localhost',
    'http://127.0.0.1',
    /\.denticsdentalcare\.in$/
  ],
  methods: ['GET'],
}));

app.use(express.json());

// ── Helper: load fresh data on every request (no restart needed) ──
function loadData() {
  const filePath = path.join(__dirname, 'clinic-data.json');
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

// ── Helper: get today's day name ──
function todayName(offsetHours = 5.5) {
  const now = new Date(Date.now() + offsetHours * 3600 * 1000);
  return now.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' }).toLowerCase();
}

// ── Helper: check if today is a holiday ──
function getTodayHoliday(holidays) {
  const today = new Date(Date.now() + 5.5 * 3600 * 1000)
    .toISOString().slice(0, 10);
  return holidays.find(h => h.date === today) || null;
}

// ─────────────────────────────────────────────
// GET /api/status  — full snapshot for the widget
// ─────────────────────────────────────────────
app.get('/api/status', (req, res) => {
  const data    = loadData();
  const day     = todayName();
  const holiday = getTodayHoliday(data.holidays);

  // Doctors available today
  const doctorsToday = data.doctors
    .filter(d => d.schedule[day]?.available)
    .map(d => ({
      id:      d.id,
      name:    d.name,
      title:   d.title,
      avatar:  d.avatar,
      morning: d.schedule[day].morning,
      evening: d.schedule[day].evening,
    }));

  // Active announcements only
  const announcements = data.announcements.filter(a => a.active);

  // Next upcoming holiday
  const today      = new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
  const nextHoliday = data.holidays
    .filter(h => h.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0] || null;

  res.json({
    ok: true,
    day,
    isHoliday:     !!holiday,
    holidayInfo:   holiday,
    doctorsToday,
    announcements,
    nextHoliday,
    clinic:        data.clinic,
    generatedAt:   new Date().toISOString(),
  });
});

// ─────────────────────────────────────────────
// GET /api/doctors  — full doctor list + schedules
// ─────────────────────────────────────────────
app.get('/api/doctors', (req, res) => {
  const data = loadData();
  res.json({ ok: true, doctors: data.doctors });
});

// ─────────────────────────────────────────────
// GET /api/announcements  — active announcements
// ─────────────────────────────────────────────
app.get('/api/announcements', (req, res) => {
  const data = loadData();
  res.json({ ok: true, announcements: data.announcements.filter(a => a.active) });
});

// ─────────────────────────────────────────────
// GET /api/holidays  — full holiday list
// ─────────────────────────────────────────────
app.get('/api/holidays', (req, res) => {
  const data = loadData();
  res.json({ ok: true, holidays: data.holidays });
});

// ─────────────────────────────────────────────
// GET /api/health  — ping endpoint
// ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ ok: true, service: 'Dentics MCP Server', timestamp: new Date().toISOString() });
});

// ─────────────────────────────────────────────
// Root
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    service: 'Dentics Dental Care — MCP Data Server',
    endpoints: [
      'GET /api/status        — full widget snapshot (use this)',
      'GET /api/doctors       — all doctors + schedules',
      'GET /api/announcements — active announcements',
      'GET /api/holidays      — holiday list',
      'GET /api/health        — health check',
    ]
  });
});

app.listen(PORT, () => {
  console.log(`✅  Dentics MCP server running on port ${PORT}`);
  console.log(`   → http://localhost:${PORT}/api/status`);
});
