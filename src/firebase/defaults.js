export const DEFAULT_VARIABLES = [
  // ACADEMICO
  { cat: 'academico', key: 'plan_estudio_preu',        type: 'object',  val: '{}',           desc: 'Plan semanal de Preu: materias, dias, horarios y metodo activo.' },
  { cat: 'academico', key: 'puntaje_meta_paes',        type: 'number',  val: '900',          desc: 'Puntaje objetivo PAES. Calibra la intensidad del plan de estudio.' },
  { cat: 'academico', key: 'nem_meta',                 type: 'number',  val: '6.6',          desc: 'Promedio NEM objetivo. Gatilla el premio de tiempo libre.' },
  { cat: 'academico', key: 'frecuencia_mini_ensayo',   type: 'string',  val: '"2x_semana"',  desc: 'Frecuencia de mini ensayos con nota. Alimenta el ciclo de retroalimentacion.' },
  { cat: 'academico', key: 'materias_activas',         type: 'array',   val: '[]',           desc: 'Materias en foco. El asistente prioriza sesiones segun este array.' },
  { cat: 'academico', key: 'universidad_objetivo',     type: 'string',  val: '""',           desc: 'Universidad y carrera meta. Define el destino final del flujo academico.' },
  // POMODORO
  { cat: 'pomodoro',  key: 'tiempo_bloque_estudio',    type: 'number',  val: '120',          desc: 'Duracion en minutos del bloque largo (2 hrs).' },
  { cat: 'pomodoro',  key: 'tiempo_descanso_largo',    type: 'number',  val: '25',           desc: 'Minutos de descanso post bloque. Rango: 20-30 min.' },
  { cat: 'pomodoro',  key: 'tiempo_micro_pausa',       type: 'number',  val: '65',           desc: 'Intervalo de concentracion antes de micro pausa. Rango: 60-70 min.' },
  { cat: 'pomodoro',  key: 'bloques_diarios_meta',     type: 'number',  val: '3',            desc: 'Bloques Pomodoro a completar por dia.' },
  // PERSONAL
  { cat: 'personal',  key: 'frecuencia_gym',           type: 'string',  val: '"3x_semana"',  desc: 'Dias de entrenamiento por semana. Parte del horario base.' },
  { cat: 'personal',  key: 'habitos_activos',          type: 'array',   val: '[]',           desc: 'Habitos en seguimiento activo.' },
  { cat: 'personal',  key: 'nivel_animo',              type: 'number',  val: '7',            desc: 'Estado de animo en escala 1-10.' },
  { cat: 'personal',  key: 'proyectos_personales',     type: 'array',   val: '[]',           desc: 'Proyectos y hobbies en curso.' },
  // OBJETIVOS
  { cat: 'objetivos', key: 'metas_semana_actual',      type: 'object',  val: '{}',           desc: 'Metas de la semana. Se evaluan en el CHECK semanal.' },
  { cat: 'objetivos', key: 'constancia_preu_racha',    type: 'number',  val: '0',            desc: 'Dias consecutivos sin faltar a Preu.' },
  { cat: 'objetivos', key: 'umbral_premio_constancia', type: 'number',  val: '14',           desc: 'Dias de racha para desbloquear el premio de constancia.' },
  { cat: 'objetivos', key: 'check_semanal_dia',        type: 'string',  val: '"domingo"',    desc: 'Dia en que se realiza el CHECK de metas.' },
  // SISTEMA
  { cat: 'sistema',   key: 'horario_base',             type: 'object',  val: '{}',           desc: 'Horario fijo: PREU, Colegio y Gym. Esqueleto inamovible.' },
  { cat: 'sistema',   key: 'modo_organizacion',        type: 'string',  val: '"estandar"',   desc: 'Modo activo: relajado | estandar | intensivo.' },
  { cat: 'sistema',   key: 'planes_mejora_activos',    type: 'boolean', val: 'true',         desc: 'Activa sugerencias proactivas del asistente.' },
  { cat: 'sistema',   key: 'retroalimentacion_activa', type: 'boolean', val: 'true',         desc: 'Activa el ciclo de retroalimentacion automatica.' },
]

export const DEFAULT_DIAGRAM = `graph LR
    %% ACADEMICA
    ACO["ACADEMICA"]:::mod

    ACO --> COL["Colegio"]:::acad
    ACO --> PRE["Preu"]:::acad

    COL --> NEM["NEM"]:::proc
    COL --> GUI["Guias"]:::proc
    COL --> ENS["Ensayos"]:::proc

    PRE --> PAE["PAES"]:::proc
    PRE --> FRL["Proc. Libres"]:::proc
    PRE --> TST["Pruebas"]:::proc
    PRE --> MNI["Mini Ensayos\\ncon Nota"]:::proc

    NEM  --> RET["Retroalimentacion"]:::feed
    PAE  --> RET
    MNI  --> RET

    ENS --> PTS
    TST --> PTS
    PAE --> PTS["Puntaje"]:::goal
    NEM --> PTS

    PTS --> UNI["Universidad"]:::dest

    %% PERSONAL
    PER["PERSONAL"]:::mod

    PER --> SAL["Salud"]:::pers
    PER --> FAM["Fam y Amigos"]:::pers
    PER --> HOB["Hobbys"]:::pers

    SAL --> FOO["Food"]:::det
    SAL --> GYM["Gym"]:::det

    HOB --> LIB["Libros"]:::det
    HOB --> PRY["Proyectos"]:::det
    HOB --> PAG["Paginas"]:::det

    %% PAUSAS
    PAU["PAUSAS Pomodoro"]:::sys

    PAU --> BLQ["Bloque: 2 hrs"]:::det
    PAU --> DSC["Descanso: 20-30 min"]:::det
    PAU --> MIC["Micro: 60-70 min"]:::det

    %% OBJETIVOS
    OBJ["OBJETIVOS"]:::mod

    OBJ --> ORG["Organizacion"]:::proc
    ORG --> MET["Metas"]:::goal
    MET --> MTP["Metas Personales"]:::det
    MET --> MTA["Metas Academicas"]:::det
    MET --> CHK(("CHECK")):::chk
    CHK --> OBJ

    %% PREMIOS
    PRMm["PREMIOS"]:::mod

    PRMm --> PR1["Constancia Preu"]:::rew
    PRMm --> PR2["NEM 6.6+"]:::rew
    PRMm --> TLB["Tiempo Libre"]:::det
    TLB  --> TL1["Familia"]:::det
    TLB  --> TL2["Cine / Carrete"]:::det
    TLB  --> TL3["Gym"]:::det
    TLB  --> TL4["Cursos / DP"]:::det

    %% MANTENIMIENTO
    MAN["MANTENIMIENTO"]:::mod
    MAN --> HOR["Horario Base\\nPREU + Colegio + Gym"]:::sys
    MAN --> OCU["Mantenerse Ocupado"]:::sys

    classDef mod  fill:#162040,stroke:#4d9cf6,stroke-width:1.8px,color:#d4dae6,font-weight:600
    classDef acad fill:#0e1e35,stroke:#4d9cf6,stroke-width:1.2px,color:#7ab8fa
    classDef pers fill:#0e2218,stroke:#3dba6f,stroke-width:1.2px,color:#6dd49a
    classDef proc fill:#191929,stroke:#9d7cf0,stroke-width:1px,color:#c2a8f5
    classDef goal fill:#1e1800,stroke:#e8a245,stroke-width:1.8px,color:#e8a245,font-weight:600
    classDef dest fill:#190f38,stroke:#9d7cf0,stroke-width:2px,color:#9d7cf0,font-weight:600
    classDef feed fill:#1e1010,stroke:#e05c5c,stroke-width:1px,color:#f09090
    classDef sys  fill:#0a1a14,stroke:#36c9a0,stroke-width:1.2px,color:#36c9a0
    classDef det  fill:#111318,stroke:#252a33,stroke-width:1px,color:#505a6e
    classDef rew  fill:#1e1500,stroke:#e8a245,stroke-width:1px,color:#e8a245
    classDef chk  fill:#162040,stroke:#4d9cf6,stroke-width:1.8px,color:#4d9cf6`
