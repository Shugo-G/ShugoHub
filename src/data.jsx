// ── Endpoints, intervalos de polling, datos mock de fallback y normalizadores ──

const API_VMS      = '/api/vms/';
const API_HUB      = '/api/hub/';
const API_TICKETS  = '/api/tickets/';
const API_ASSIGNED = '/api/tickets/assigned';
const POLL_VMS_MS      = 30_000;
const POLL_HUB_MS      = 60_000;
const POLL_TICKETS_MS  = 30_000;
const POLL_ASSIGNED_MS = 30_000;
const TICKET_ROTATE_MS = 5_000;

const VMS_MOCK = [
  { name: "ubuntu26",        ip: "192.168.0.152",    cpu: 0.0,  ram: 11.1, disk: 57.3, status: "online", warn: 1,   crit: 0 },
  { name: "proxy-nginx",     ip: "192.168.0.12",     cpu: 0.5,  ram: 17.3, disk: 19.5, status: "online", warn: 10,  crit: 0 },
  { name: "cloud",           ip: "192.168.0.5",      cpu: 0.0,  ram: 6.9,  disk: 62.7, status: "online", warn: 84,  crit: 0 },
  { name: "LEXDOCTOR",       ip: "192.168.100.199",  cpu: 1.5,  ram: 18.4, disk: 54.4, status: "online", warn: 0,   crit: 0 },
  { name: "WS-TOLHUIN",      ip: "192.168.90.170",   cpu: 0.8,  ram: 14.6, disk: 88.9, status: "warn",   warn: 0,   crit: 0 },
  { name: "sisa500gb",       ip: "192.168.90.213",   cpu: 0.4,  ram: 19.1, disk: 43.6, status: "online", warn: 17,  crit: 0 },
  { name: "roundcube",       ip: "192.168.0.9",      cpu: 0.0,  ram: 19.0, disk: 16.8, status: "online", warn: 92,  crit: 0 },
  { name: "dockerproducci",  ip: "192.168.0.14",     cpu: 16,   ram: 16.6, disk: 70.6, status: "online", warn: 102, crit: 0 },
  { name: "CRONOS XXI",      ip: "192.168.0.11",     cpu: 16,   ram: 41.6, disk: 83.6, status: "warn",   warn: 0,   crit: 0 },
  { name: "serverdev-VM",    ip: "192.168.0.106",    cpu: 0.0,  ram: 8.0,  disk: 52.4, status: "online", warn: 2,   crit: 0 },
];

const CLOCKS_MOCK = [
  { name: "BG-PLTA-USH",   ip: "181.118.101.156:4371", idadm: 151, last: "11:30:01", status: "ok" },
  { name: "CAMPOS-133",    ip: "192.168.1.201:4370",   idadm: 4,   last: "11:30:02", status: "ok" },
  { name: "COB-MORA-USH",  ip: "192.168.150.102:4370", idadm: 3,   last: "11:30:03", status: "ok" },
  { name: "COM-TOL",       ip: "38.224.63.252:4370",   idadm: 1,   last: "11:30:07", status: "ok" },
  { name: "DOT-USH",       ip: "192.168.150.101:4370", idadm: 101, last: "11:30:07", status: "ok" },
  { name: "INFORMAT-USH",  ip: "192.168.0.22:4370",    idadm: 8,   last: "11:30:10", status: "ok" },
  { name: "PGB-ADM-USH",   ip: "181.118.101.156:4370", idadm: 150, last: "11:30:11", status: "ok" },
  { name: "PP-TOL",        ip: "38.224.63.253:4370",   idadm: 6,   last: "11:30:13", status: "ok" },
  { name: "PP1-DOT-USH",   ip: "181.118.69.20:4372",   idadm: 102, last: "11:30:14", status: "ok" },
  { name: "PP1-PANOL-USH", ip: "181.118.69.20:4373",   idadm: 113, last: "11:30:16", status: "ok" },
  { name: "PP1-REDES-USH", ip: "181.118.69.20:4370",   idadm: 111, last: "11:30:18", status: "ok" },
  { name: "PP2-LAB-USH",   ip: "181.118.69.217:4372",  idadm: 202, last: "11:30:19", status: "ok" },
  { name: "PP2-OFIC-USH",  ip: "181.118.69.217:4370",  idadm: 201, last: "11:30:20", status: "ok" },
  { name: "PP2-PLTA-USH",  ip: "181.118.69.217:4371",  idadm: 203, last: "11:30:22", status: "ok" },
  { name: "PP3-USH",       ip: "181.118.69.18:555",    idadm: 103, last: "11:30:23", status: "ok" },
  { name: "PP4-USH",       ip: "179.62.73.126:4370",   idadm: 104, last: "11:30:25", status: "ok" },
  { name: "REDES-TOL",     ip: "38.224.63.254:4370",   idadm: 2,   last: "11:30:26", status: "ok" },
];

const RADIO_STATIONS = [
  { name: "FM Aspen 102.3",  genre: "clásica · pop", url: "https://playerservices.streamtheworld.com/api/livestream-redirect/ASPEN.mp3" },
  { name: "Groove Salad",    genre: "ambient", url: "https://ice2.somafm.com/groovesalad-128-mp3" },
  { name: "Drone Zone",      genre: "ambient", url: "https://ice2.somafm.com/dronezone-128-mp3" },
  { name: "Lush",            genre: "vocal",   url: "https://ice2.somafm.com/lush-128-mp3" },
  { name: "Indie Pop Rocks", genre: "indie",   url: "https://ice2.somafm.com/indiepop-128-mp3" },
  { name: "Bossa Beyond",    genre: "bossa",   url: "https://ice2.somafm.com/bossa-128-mp3" },
];

function normalizeVM(v) {
  const s = v.latest_status || {};
  const noData = !v.latest_status;
  const cpu  = parseFloat(s.cpu_usage    ?? 0) || 0;
  const ram  = parseFloat(s.ram_percent  ?? 0) || 0;
  const disk = parseFloat(s.disk_percent ?? 0) || 0;

  const tsRaw = s.timestamp || s.created_at || s.recorded_at || v.last_seen || v.updated_at;
  const staleByTime = tsRaw ? (Date.now() - new Date(tsRaw).getTime() > 3 * 60 * 1000) : false;

  let status = 'online';
  if (noData || v.is_stale || staleByTime) {
    status = 'offline';
  } else if (cpu > 80 || ram > 80 || disk > 80) {
    status = 'crit';
  } else if (cpu > 50 || ram > 50 || disk > 50) {
    status = 'warn';
  }

  return {
    name: v.display_name || v.hostname || v.name || '?',
    ip:   v.ip_address   || v.ip       || '',
    cpu, ram, disk, status,
    lastSeen: tsRaw || null,
    warn: 0, crit: 0,
  };
}

function normalizeClock(c) {
  const raw = c.ultimo_ciclo_ok || c.last || '';
  const last = raw.includes(' ') ? raw.split(' ')[1] : raw;
  return {
    name:   c.nombre  || c.name   || '?',
    ip:     c.puerto  ? `${c.ip}:${c.puerto}` : (c.ip || ''),
    idadm:  c.idadm   ?? '',
    last,
    status: (c.estado || c.status || 'ok').toLowerCase(),
  };
}

Object.assign(window, {
  API_VMS, API_HUB, API_TICKETS, API_ASSIGNED,
  POLL_VMS_MS, POLL_HUB_MS, POLL_TICKETS_MS, POLL_ASSIGNED_MS, TICKET_ROTATE_MS,
  VMS_MOCK, CLOCKS_MOCK, RADIO_STATIONS, normalizeVM, normalizeClock,
});
