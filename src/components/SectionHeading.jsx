import React from 'react'

// Ícono por defecto: pequeño destello dorado, usado cuando no se pasa uno específico.
function DefaultIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l2.2 6.8L21 11l-6.8 2.2L12 20l-2.2-6.8L3 11l6.8-2.2z" />
    </svg>
  )
}

// Encabezado de sección: ícono dorado a la izquierda + título + línea
// decorativa (degradado dorado → transparente) que se extiende a la derecha.
export default function SectionHeading({ icon, title, right, size = 'md', style }) {
  return (
    <div className={`section-heading${size === 'lg' ? ' section-heading--lg' : ''}`} style={style}>
      <span className="section-heading-icon">{icon || <DefaultIcon />}</span>
      <h2 className="section-heading-title">{title}</h2>
      <span className="section-heading-line" />
      {right != null && <span className="section-heading-right">{right}</span>}
    </div>
  )
}
