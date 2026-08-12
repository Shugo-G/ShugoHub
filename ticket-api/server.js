const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.TICKETS_DB_HOST,
  port: Number(process.env.TICKETS_DB_PORT || 5432),
  database: process.env.TICKETS_DB_NAME,
  user: process.env.TICKETS_DB_USER,
  password: process.env.TICKETS_DB_PASSWORD,
  max: 5,
  idleTimeoutMillis: 30_000,
  statement_timeout: 10_000,
});

pool.on('error', (err) => console.error('[ticket-api] pool error', err.message));

// id_estado_ticket -> categoría mostrada en el dashboard
const STATE_TO_CATEGORY = { 5: 'pendientes', 7: 'reabiertos', 8: 'infoextra' };
const ASSIGNED_STATE_TO_CATEGORY = { 9: 'asignados', 6: 'enproceso', 10: 'mejoras' };
const MAX_PER_CATEGORY = 40;

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<img[^>]*>/gi, '')
    .replace(/<\/(p|div|li|tr)>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const app = express();

app.get('/health', (req, res) => res.json({ ok: true }));

app.get('/', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.idtic, t.titletick, t.messagetic,
             tp.namettic, lt.id_estado_ticket, lt.fecha_tratamiento_ticket
      FROM (
        SELECT DISTINCT ON (idtic) idtic, id_estado_ticket, fecha_tratamiento_ticket
        FROM tickets_tratamientos
        ORDER BY idtic, id_tratamiento_ticket DESC
      ) lt
      JOIN tickets t ON t.idtic = lt.idtic
      LEFT JOIN tipostickets tp ON tp.idttic = t.idttic
      WHERE lt.id_estado_ticket IN (5, 7, 8)
      ORDER BY lt.fecha_tratamiento_ticket DESC
    `);

    const grouped = { pendientes: [], reabiertos: [], infoextra: [] };

    for (const r of rows) {
      const key = STATE_TO_CATEGORY[r.id_estado_ticket];
      if (!key || grouped[key].length >= MAX_PER_CATEGORY) continue;
      grouped[key].push({
        id: r.idtic,
        title: r.titletick,
        area: r.namettic || '',
        message: stripHtml(r.messagetic),
        date: r.fecha_tratamiento_ticket,
      });
    }

    res.set('Cache-Control', 'no-store');
    res.json(grouped);
  } catch (e) {
    console.error('[ticket-api] query error', e.message);
    res.status(502).json({ error: 'db_unavailable' });
  }
});

app.get('/assigned', async (req, res) => {
  try {
    const { rows } = await pool.query(`
      SELECT t.idtic, t.titletick, t.messagetic, tp.namettic,
             lt.id_estado_ticket, lt.fecha_tratamiento_ticket,
             a.idadm, a.loginadm, a.firstnameadm_viejo, a.lastnameadm_viejo
      FROM (
        SELECT DISTINCT ON (idtic) id_tratamiento_ticket, idtic, id_estado_ticket, fecha_tratamiento_ticket
        FROM tickets_tratamientos
        ORDER BY idtic, id_tratamiento_ticket DESC
      ) lt
      JOIN tickets t ON t.idtic = lt.idtic
      LEFT JOIN tipostickets tp ON tp.idttic = t.idttic
      JOIN tickets_tratamientos_asignados ta ON ta.id_ticket_tratamiento = lt.id_tratamiento_ticket
      JOIN admins a ON a.idadm = ta.idadm
      WHERE lt.id_estado_ticket IN (6, 9, 10)
      ORDER BY lt.fecha_tratamiento_ticket DESC
    `);

    const byAgent = new Map();
    for (const r of rows) {
      const key = ASSIGNED_STATE_TO_CATEGORY[r.id_estado_ticket];
      if (!key) continue;
      if (!byAgent.has(r.idadm)) {
        const first = (r.firstnameadm_viejo || '').trim();
        const last = (r.lastnameadm_viejo || '').trim();
        byAgent.set(r.idadm, {
          idadm: r.idadm,
          nombre: (first || last) ? `${first} ${last}`.trim() : r.loginadm,
          counts: { asignados: 0, enproceso: 0, mejoras: 0 },
          tickets: { asignados: [], enproceso: [], mejoras: [] },
        });
      }
      const agent = byAgent.get(r.idadm);
      agent.counts[key] += 1;
      if (agent.tickets[key].length < MAX_PER_CATEGORY) {
        agent.tickets[key].push({
          id: r.idtic,
          title: r.titletick,
          area: r.namettic || '',
          message: stripHtml(r.messagetic),
          date: r.fecha_tratamiento_ticket,
        });
      }
    }

    const agentes = [...byAgent.values()]
      .map((a) => ({ ...a, total: a.counts.asignados + a.counts.enproceso + a.counts.mejoras }))
      .sort((a, b) => b.total - a.total);

    res.set('Cache-Control', 'no-store');
    res.json({ agentes });
  } catch (e) {
    console.error('[ticket-api] assigned query error', e.message);
    res.status(502).json({ error: 'db_unavailable' });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`[ticket-api] listening on ${PORT}`));
