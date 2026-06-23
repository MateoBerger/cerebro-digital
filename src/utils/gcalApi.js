const BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'
const TZ   = 'America/Santiago'

// dia index 0=Lun … 6=Dom (same as CalendarioTab convention)
const BYDAY = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']

async function req(token, url, opts = {}) {
  if (!token) throw Object.assign(new Error('No hay token de Google Calendar'), { code: 'no_token' })
  const res = await fetch(url, {
    ...opts,
    headers: {
      Authorization:  `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (res.status === 401) throw Object.assign(new Error('Token de Google Calendar expirado'), { code: 'token_expired' })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Google Calendar API ${res.status}: ${body}`)
  }
  return res.status === 204 ? null : res.json()
}

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function buildEventBody(form, dayDate, forCreate = false) {
  const date = toDateStr(dayDate)
  const ev = {
    summary:     form.titulo,
    description: form.descripcion || '',
    start: { dateTime: `${date}T${form.horaInicio}:00`, timeZone: TZ },
    end:   { dateTime: `${date}T${form.horaFin}:00`,   timeZone: TZ },
    extendedProperties: { private: { tipo: form.tipo || 'otro', smgv: '1' } },
  }
  if (forCreate && form.recurrente) {
    ev.recurrence = [`RRULE:FREQ=WEEKLY;BYDAY=${BYDAY[form.dia]}`]
  }
  return ev
}

// ── API functions ──────────────────────────────────────────

export async function gcalListarEventos(token, timeMin, timeMax) {
  const params = new URLSearchParams({
    timeMin:       timeMin.toISOString(),
    timeMax:       timeMax.toISOString(),
    singleEvents:  'true',
    orderBy:       'startTime',
    timeZone:      TZ,
    maxResults:    '500',
  })
  const data = await req(token, `${BASE}?${params}`)
  return data.items || []
}

export async function gcalCrearEvento(token, form, dayDate) {
  return req(token, BASE, { method: 'POST', body: JSON.stringify(buildEventBody(form, dayDate, true)) })
}

export async function gcalActualizarEvento(token, eventId, form, dayDate) {
  return req(token, `${BASE}/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body:   JSON.stringify(buildEventBody(form, dayDate, false)),
  })
}

export async function gcalEliminarEvento(token, eventId) {
  return req(token, `${BASE}/${encodeURIComponent(eventId)}`, { method: 'DELETE' })
}

export async function gcalGetEvento(token, eventId) {
  return req(token, `${BASE}/${encodeURIComponent(eventId)}`)
}

export async function gcalPatchEvento(token, eventId, patch) {
  return req(token, `${BASE}/${encodeURIComponent(eventId)}`, {
    method: 'PATCH',
    body:   JSON.stringify(patch),
  })
}

// ── Conversion: Google Calendar event → bloque interno ────

export function gcalEventToBloque(gcalEvent, weekDays) {
  const startStr = gcalEvent.start?.dateTime
  const endStr   = gcalEvent.end?.dateTime
  if (!startStr || !endStr) return null

  const start = new Date(startStr)
  const end   = new Date(endStr)

  const dayStr = toDateStr(start)
  const di     = weekDays.findIndex(d => toDateStr(d) === dayStr)

  return {
    id:          gcalEvent.id,
    titulo:      gcalEvent.summary || '(sin título)',
    descripcion: gcalEvent.description || '',
    tipo:        gcalEvent.extendedProperties?.private?.tipo || 'otro',
    dia:         di,
    horaInicio:  `${String(start.getHours()).padStart(2,'0')}:${String(start.getMinutes()).padStart(2,'0')}`,
    horaFin:     `${String(end.getHours()).padStart(2,'0')}:${String(end.getMinutes()).padStart(2,'0')}`,
    // null = recurrente (o instancia de recurrente), string = evento único
    semana:      gcalEvent.recurringEventId ? null : dayStr,
    isSmgv:      gcalEvent.extendedProperties?.private?.smgv === '1',
  }
}
