import { useEffect, useState } from 'react'
import { gcalListarEventos } from '../utils/gcalApi'

// Eventos de Google Calendar del día de hoy (hora local del dispositivo),
// compartido entre InicioTab y el widget de "próximo evento" para evitar
// pedir la misma data dos veces.
export function useEventosHoy(gcalToken, onGcalExpired) {
  const [eventosHoy, setEventosHoy] = useState(null)

  useEffect(() => {
    if (!gcalToken) return
    let cancelled = false
    const start = new Date(); start.setHours(0, 0, 0, 0)
    const end   = new Date(); end.setHours(23, 59, 59, 999)

    gcalListarEventos(gcalToken, start, end)
      .then(items => {
        if (cancelled) return
        setEventosHoy(
          items
            .filter(e => e.start?.dateTime)
            .sort((a, b) => new Date(a.start.dateTime) - new Date(b.start.dateTime))
            .map(e => ({
              id:         e.id,
              titulo:     e.summary || '(sin título)',
              start:      e.start.dateTime,
              end:        e.end.dateTime,
              horaInicio: new Date(e.start.dateTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
              horaFin:    new Date(e.end.dateTime).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
              tipo:       e.extendedProperties?.private?.tipo || 'otro',
            }))
        )
      })
      .catch(err => {
        if (cancelled) return
        if (err.code === 'token_expired') onGcalExpired?.()
        setEventosHoy([])
      })

    return () => { cancelled = true }
  }, [gcalToken]) // eslint-disable-line react-hooks/exhaustive-deps

  return eventosHoy
}
