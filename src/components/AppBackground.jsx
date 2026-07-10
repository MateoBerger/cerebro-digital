import React from 'react'

// Fondo animado global: manchas de luz dorada muy tenues + ruido fino.
// Fijo detrás de toda la app — los paneles deben tener fondo transparente
// para que se vea a través de ellos.
export default function AppBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <span className="app-bg-blob app-bg-blob--1" />
      <span className="app-bg-blob app-bg-blob--2" />
      <span className="app-bg-blob app-bg-blob--3" />
      <div className="app-bg-noise" />
    </div>
  )
}
