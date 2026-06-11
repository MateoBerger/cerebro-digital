// Contenido educativo PAES — extraído y adaptado del HTML de referencia paes-base.html

// ── VOCABULARIO (35 términos) ───────────────────────────────────────────────
export const VOCAB_BANK = [
  { id:'v001', term:'Analogía',      def:'Relación de semejanza entre cosas distintas.', type:'Retórica',         examples:['La vida es como un viaje largo y sinuoso.','Sus ojos eran estrellas brillantes en la noche.'] },
  { id:'v002', term:'Anáfora',       def:'Repetición de una o varias palabras al inicio de versos o frases consecutivas.', type:'Figura Retórica', examples:['Aquí todo es guerra, aquí todo es dolor, aquí todo es silencio.','Volver a los diecisiete, volver a ser joven.'] },
  { id:'v003', term:'Antítesis',     def:'Oposición de ideas, palabras o conceptos contrarios en una misma frase.', type:'Figura Retórica', examples:['Es tan corto el amor y tan largo el olvido.','A grandes males, grandes remedios.'] },
  { id:'v004', term:'Cosmovisión',   def:'Conjunto de creencias y valores que definen la visión del mundo de una cultura.', type:'Concepto',        examples:['La cosmovisión mapuche concibe la naturaleza como un ser vivo.','El positivismo es una cosmovisión basada en la ciencia.'] },
  { id:'v005', term:'Diegético',     def:'Perteneciente al mundo narrado de la historia.', type:'Narrativa',       examples:['El narrador homodiegético participa en los hechos.','La música diegética es la que oye el personaje.'] },
  { id:'v006', term:'Elocuencia',    def:'Habilidad para expresarse con eficacia y persuasión.', type:'Retórica',   examples:['Su elocuencia cautivó a todos los presentes.','La elocuencia es fundamental en la oratoria.'] },
  { id:'v007', term:'Epíteto',       def:'Adjetivo que expresa una cualidad inherente del sustantivo al que acompaña.', type:'Figura Retórica', examples:['La blanca nieve cubría las montañas.','El feroz león rugía en la selva.'] },
  { id:'v008', term:'Focalización',  def:'Perspectiva desde la que se narra una historia.', type:'Narrativa',      examples:['La focalización interna nos da acceso a los pensamientos del personaje.','La focalización cero es la del narrador omnisciente.'] },
  { id:'v009', term:'Gradación',     def:'Progresión ascendente o descendente de ideas o sentimientos.', type:'Figura Retórica', examples:['Llegué, vi, vencí.','Un gemido, un suspiro, un sollozo, un llanto desgarrador.'] },
  { id:'v010', term:'Hipérbole',     def:'Exageración retórica para enfatizar una idea.', type:'Figura Retórica', examples:['Te lo he dicho mil veces.','Tengo tanto sueño que podría dormir cien años.'] },
  { id:'v011', term:'Intertextualidad', def:'Relación que un texto establece con otros textos previos.', type:'Teoría Literaria', examples:['La novela hace intertextualidad con el Quijote.','El poema tiene referencias intertextuales a la Biblia.'] },
  { id:'v012', term:'Ironía',        def:'Expresión de algo contrario a lo que se piensa o siente.', type:'Figura Retórica', examples:['¡Qué brillante idea! (dicho de algo tonto)','¡Claro que sí! (negando en realidad)'] },
  { id:'v013', term:'Isotopía',      def:'Red de significados que otorga coherencia a un texto.', type:'Semántica',  examples:['El campo semántico del agua crea una isotopía marina.','Las referencias al fuego crean una isotopía de pasión.'] },
  { id:'v014', term:'Metáfora',      def:'Identificación de dos términos con significados distintos por su semejanza.', type:'Figura Retórica', examples:['La vida es un sueño.','Sus palabras eran puñales que herían.'] },
  { id:'v015', term:'Metonimia',     def:'Sustitución de un término por otro con el que tiene relación de contigüidad.', type:'Figura Retórica', examples:['Bebí tres vasos (contenido por recipiente).','Leer a Neruda (autor por sus obras).'] },
  { id:'v016', term:'Narrador heterodiegético', def:'Narrador que no participa en los hechos narrados.', type:'Narrativa', examples:['El narrador en tercera persona clásico es heterodiegético.','Narra los hechos desde afuera, sin ser personaje.'] },
  { id:'v017', term:'Narrador homodiegético',   def:'Narrador que sí participa como personaje en los hechos narrados.', type:'Narrativa', examples:['El narrador protagonista es homodiegético.','Narra en primera persona su propia historia.'] },
  { id:'v018', term:'Oxímoron',      def:'Combinación de dos términos de significado opuesto en una misma expresión.', type:'Figura Retórica', examples:['Un silencio atronador.','Luz oscura que alumbra la noche.'] },
  { id:'v019', term:'Paradoja',      def:'Afirmación que parece contradictoria pero encierra una verdad.', type:'Figura Retórica', examples:['Solo sé que no sé nada.','El que muere por los demás, vive para siempre.'] },
  { id:'v020', term:'Paráfrasis',    def:'Reformulación de un texto con otras palabras manteniendo el mismo sentido.', type:'Lectura', examples:['Parafrasear es comprender y explicar con propias palabras.','Ayuda a verificar la comprensión lectora.'] },
  { id:'v021', term:'Personificación', def:'Atribución de cualidades humanas a seres no humanos.', type:'Figura Retórica', examples:['El viento susurra entre los árboles.','La luna nos observa con sus ojos plateados.'] },
  { id:'v022', term:'Polisemia',     def:'Propiedad de las palabras que tienen varios significados.', type:'Semántica', examples:['Banco: institución financiera / asiento.','Gato: animal / herramienta mecánica.'] },
  { id:'v023', term:'Polifonía',     def:'Presencia de varias voces o perspectivas en un texto.', type:'Narrativa', examples:['La novela polifónica presenta múltiples puntos de vista.','Dostoievski es maestro de la novela polifónica.'] },
  { id:'v024', term:'Referente',     def:'Objeto o realidad a la que alude un signo lingüístico.', type:'Semántica', examples:['El referente de "árbol" es el vegetal real.','La deixis señala referentes en el contexto.'] },
  { id:'v025', term:'Sátira',        def:'Crítica burlona hacia vicios o defectos sociales.', type:'Géneros', examples:['La sátira política critica a los gobernantes.','Voltaire usaba la sátira para criticar la sociedad.'] },
  { id:'v026', term:'Semántica',     def:'Rama de la lingüística que estudia el significado de las palabras.', type:'Lingüística', examples:['El campo semántico del amor: afecto, cariño, ternura.','La semántica analiza cómo cambian los significados.'] },
  { id:'v027', term:'Símbolo',       def:'Elemento que representa otro por convención o analogía.', type:'Semántica', examples:['La paloma es símbolo de paz.','El fuego simboliza pasión y destrucción.'] },
  { id:'v028', term:'Sinécdoque',    def:'Figura que nombra la parte por el todo o el todo por la parte.', type:'Figura Retórica', examples:['Necesito un par de manos (personas).','Chile ganó (la selección por el país).'] },
  { id:'v029', term:'Tesis',         def:'Proposición o idea central que el autor defiende en un texto argumentativo.', type:'Argumentación', examples:['La tesis debe estar claramente expresada.','Los argumentos refuerzan la tesis del texto.'] },
  { id:'v030', term:'Verosimilitud', def:'Cualidad de lo que parece verdadero o creíble aunque sea ficción.', type:'Narrativa', examples:['Una buena novela mantiene la verosimilitud.','Depende del pacto con el lector.'] },
  { id:'v031', term:'Argumentación', def:'Proceso de justificar una idea con razones o pruebas.', type:'Discurso', examples:['Una argumentación incluye tesis, argumentos y conclusión.','La científica se basa en evidencias.'] },
  { id:'v032', term:'Cohesión',      def:'Propiedad del texto que garantiza la conexión entre sus partes mediante recursos lingüísticos.', type:'Lingüística', examples:['Se logra con conectores y pronombres.','Un texto cohesionado fluye naturalmente.'] },
  { id:'v033', term:'Coherencia',    def:'Propiedad del texto que garantiza la unidad temática y lógica.', type:'Lingüística', examples:['Un texto es coherente cuando todas sus partes hablan del mismo tema.','Se pierde con contradicciones.'] },
  { id:'v034', term:'Deixis',        def:'Mecanismo lingüístico que señala personas, lugares o tiempos en el contexto.', type:'Pragmática', examples:['Este libro (deixis espacial).','Ahora te lo explico (deixis temporal).'] },
  { id:'v035', term:'Inferencia',    def:'Conclusión que se obtiene de información implícita en un texto.', type:'Comprensión', examples:['El lector infiere que el personaje está asustado por sus acciones.','Va más allá de lo literal.'] },
]

// ── TIPS DE MATEMÁTICA (20) ─────────────────────────────────────────────────
export const MATH_TIPS = [
  { id:'mt001', area:'M1', tip:'Regla de tres: si a/b = c/d, entonces a·d = b·c (productos cruzados).' },
  { id:'mt002', area:'M1', tip:'Porcentaje: P% de X = (P/100)·X. Aumentar: X·(1+P/100). Disminuir: X·(1-P/100).' },
  { id:'mt003', area:'M1', tip:'Factorización clave: a²−b² = (a+b)(a−b). Buscá diferencia de cuadrados primero.' },
  { id:'mt004', area:'M1', tip:'Fórmula cuadrática: x = (−b ± √(b²−4ac)) / (2a). Discriminante D = b²−4ac: D>0 → 2 raíces reales; D=0 → 1 raíz; D<0 → sin raíces reales.' },
  { id:'mt005', area:'M1', tip:'Pitágoras: c² = a² + b² (c = hipotenusa, lados del triángulo rectángulo).' },
  { id:'mt006', area:'M1', tip:'Área triángulo = base × altura / 2. La altura siempre perpendicular a la base.' },
  { id:'mt007', area:'M1', tip:'Progresión aritmética: aₙ = a₁ + (n−1)d. Suma de n términos = n(a₁+aₙ)/2.' },
  { id:'mt008', area:'M1', tip:'Progresión geométrica: aₙ = a₁·rⁿ⁻¹. Suma = a₁(1−rⁿ)/(1−r) con r≠1.' },
  { id:'mt009', area:'M1', tip:'Probabilidad = casos favorables / casos totales. Siempre entre 0 y 1. Complemento: P(Aᶜ) = 1 − P(A).' },
  { id:'mt010', area:'M1', tip:'Media = suma/cantidad. Mediana = valor central ordenado. Moda = valor que más se repite.' },
  { id:'mt011', area:'M2', tip:'Dominio = valores de x permitidos (denominador ≠ 0, raíz de no negativos). Recorrido = valores de y posibles.' },
  { id:'mt012', area:'M2', tip:'Función cuadrática f(x) = ax²+bx+c: vértice en x = −b/(2a). Si a>0 abre arriba; a<0, abajo.' },
  { id:'mt013', area:'M2', tip:'Derivada de xⁿ = n·xⁿ⁻¹. Regla del producto: (fg)ʹ = fʹg + fgʹ. Derivada de constante = 0.' },
  { id:'mt014', area:'M2', tip:'Logaritmo: log_b(xy) = log_b(x)+log_b(y). log_b(x/y) = log_b(x)−log_b(y). log_b(xⁿ) = n·log_b(x).' },
  { id:'mt015', area:'M2', tip:'Potencias: bˣ·bʸ = bˣ⁺ʸ. (bˣ)ʸ = bˣʸ. b⁰ = 1. b⁻ˣ = 1/bˣ.' },
  { id:'mt016', area:'M2', tip:'Función inversa f⁻¹: si f(a)=b entonces f⁻¹(b)=a. Gráfica: reflejo de f respecto a y=x.' },
  { id:'mt017', area:'M2', tip:'Número complejo z = a+bi: i² = −1. Módulo |z| = √(a²+b²). Conjugado: ā−bi.' },
  { id:'mt018', area:'M2', tip:'Límite lim(x→a) f(x) = L: f(x) se aproxima a L al acercarse x a a (no necesita f(a)=L).' },
  { id:'mt019', area:'M2', tip:'Integral definida ∫[a,b] f(x)dx = F(b)−F(a), donde F es la antiderivada de f.' },
  { id:'mt020', area:'M2', tip:'Vectores: suma componente a componente. Producto punto: v·w = v₁w₁+v₂w₂. |v| = √(v₁²+v₂²).' },
]

// ── DATOS CURIOSOS (10) ─────────────────────────────────────────────────────
export const DATOS_CURIOSOS = [
  { id:'dc001', area:'Ciencias',   fact:'El ADN de todos los humanos vivos es 99.9% idéntico. Solo el 0.1% nos hace únicos.',     source:'Biología' },
  { id:'dc002', area:'Ciencias',   fact:'El sonido viaja ~4 veces más rápido en el agua (1480 m/s) que en el aire (343 m/s).',     source:'Física' },
  { id:'dc003', area:'Lenguaje',   fact:'La palabra "quásar" viene del inglés "quasi-stellar object": el objeto más brillante del universo.', source:'Astronomía' },
  { id:'dc004', area:'Matemática', fact:'El número π tiene infinitas cifras sin patrón. Se han calculado más de 100 billones de dígitos.', source:'Matemáticas' },
  { id:'dc005', area:'Ciencias',   fact:'Las neuronas pueden transmitir señales a 430 km/h. El cerebro tiene ~86 mil millones de neuronas.', source:'Neurología' },
  { id:'dc006', area:'Lenguaje',   fact:'El diccionario Oxford del inglés registra más de 600.000 palabras, el mayor del mundo.',  source:'Lingüística' },
  { id:'dc007', area:'Ciencias',   fact:'Fotosíntesis: 6CO₂ + 6H₂O + luz → C₆H₁₂O₆ + 6O₂. Ocurre en los cloroplastos.',       source:'Biología' },
  { id:'dc008', area:'Matemática', fact:'Con 23 personas en una habitación hay >50% de probabilidad de que dos compartan cumpleaños.', source:'Probabilidad' },
  { id:'dc009', area:'Ciencias',   fact:'La presión atmosférica equivale a una columna de agua de 10 metros: 101.325 Pa.',        source:'Física' },
  { id:'dc010', area:'Lenguaje',   fact:'El castellano tiene 2 géneros gramaticales; el alemán tiene 3 (masculino, femenino, neutro).', source:'Gramática' },
]

// ── GUÍAS (10) ──────────────────────────────────────────────────────────────
export const GUIDES_DATA = [
  {
    id: 'leng-localizar',
    label: 'Localizar Información',
    subject: 'cl',
    color: '#5b9cf6',
    theory: `La habilidad de **localizar información** consiste en identificar datos específicos explícitos en el texto: fechas, nombres, cifras o afirmaciones concretas.

**Estrategia en 3 pasos:**
1. Lee la pregunta e identifica las palabras clave (¿quién?, ¿cuándo?, ¿cuánto?).
2. Haz una lectura rápida (skimming) para ubicar la sección relevante del texto.
3. Lee con atención esa sección y extrae la respuesta.

**¡OJO con los distractores!** Las opciones incorrectas suelen:
- Usar palabras del texto pero en distinto contexto.
- Combinar información real de dos partes del texto.
- Cambiar un detalle clave (número, nombre, relación).`,
    tips: ['Subraya las palabras clave de la pregunta antes de buscar.', 'La respuesta correcta suele parafrasear el texto, no copiarlo.', 'Desconfía de opciones que son literalmente iguales al texto; pueden estar fuera de contexto.'],
  },
  {
    id: 'leng-caracterizar',
    label: 'Caracterizar Personajes',
    subject: 'cl',
    color: '#f472b6',
    theory: `**Caracterizar** significa describir cómo es un personaje (físico, psicológico, social) a partir de la información del texto.

**Tipos de caracterización:**
- **Directa:** el narrador o un personaje describe explícitamente ("era un hombre nervioso").
- **Indirecta:** se infiere de acciones, diálogos, pensamientos o reacciones del personaje.

**Estrategia:**
1. Identifica todo lo que el texto dice sobre el personaje (acciones + palabras + descripción).
2. Busca el rasgo que engloba mejor esa información.
3. Desconfía de caracterizaciones parciales o que solo se apoyen en un detalle.`,
    tips: ['Las preguntas de caracterización suelen pedir el rasgo DOMINANTE, no cualquier rasgo.', 'Si la opción usa exactamente la misma palabra que el texto, no siempre es la correcta.', 'Una acción puede revelar varios rasgos; escoge el que la pregunta específicamente pide.'],
  },
  {
    id: 'leng-relacionar',
    label: 'Relacionar e Integrar',
    subject: 'cl',
    color: '#c084fc',
    theory: `**Relacionar e integrar** es conectar información de distintas partes del texto o con conocimiento previo para elaborar una comprensión global.

**Tipos de relaciones:**
- **Causa-efecto:** identificar por qué ocurre algo.
- **Comparación:** semejanzas y diferencias entre ideas o personajes.
- **Secuencia:** orden en que ocurren los eventos.
- **Problema-solución:** situación y respuesta a ella.

**Estrategia:**
1. Lee el fragmento completo antes de responder.
2. Identifica el tipo de relación que pregunta (causa, comparación, etc.).
3. Verifica que la opción elegida integra información de dos o más partes del texto.`,
    tips: ['Las respuestas incorrectas suelen referirse solo a una parte del texto.', 'Si la pregunta dice "a partir del texto en general", debés integrar todo.', 'Los conectores (porque, aunque, sin embargo) son señales de tipo de relación.'],
  },
  {
    id: 'mat-numeros',
    label: 'Números y Operaciones',
    subject: 'm1',
    color: '#3ec97e',
    theory: `Área fundamental de M1. Incluye: fracciones, decimales, potencias, raíces, proporcionalidad y porcentajes.

**Fracciones:** a/b ÷ c/d = a/b × d/c. Para sumar: denominador común.
**Porcentaje:** P% de X = (P/100)·X. Variación porcentual = (nuevo-original)/original × 100.
**Potencias:** aⁿ·aᵐ = aⁿ⁺ᵐ. (aⁿ)ᵐ = aⁿᵐ. a⁰ = 1. a⁻ⁿ = 1/aⁿ.
**Raíces:** √a · √b = √(ab). √(a/b) = √a/√b. (√a)² = a.
**Proporciones:** a/b = c/d ↔ a·d = b·c (producto de medios = producto de extremos).`,
    tips: ['Siempre simplifique fracciones antes de operar.', 'Para porcentajes en cadena: NO sume los porcentajes, multiplique los factores.', 'Verifique con un valor simple si la fórmula tiene sentido.'],
  },
  {
    id: 'mat-algebra',
    label: 'Álgebra y Funciones',
    subject: 'm1',
    color: '#f0a740',
    theory: `Álgebra de M1: ecuaciones, inecuaciones, sistemas y factorización.

**Factorizaciones clave:**
- a² − b² = (a+b)(a−b)
- a² + 2ab + b² = (a+b)²
- a² − 2ab + b² = (a−b)²

**Fórmula cuadrática:** x = (−b ± √(b²−4ac)) / (2a)
**Discriminante D = b²−4ac:** D>0 → 2 raíces distintas; D=0 → 1 raíz doble; D<0 → sin raíces reales.

**Sistemas de ecuaciones:**
- Sustitución: despeja una variable en una ecuación y sustituye en la otra.
- Suma/resta: multiplica para eliminar una variable.

**Inecuaciones:** mismas reglas que ecuaciones, pero al multiplicar/dividir por negativo, el signo se invierte.`,
    tips: ['Siempre verifica la solución sustituyendo en la ecuación original.', 'En inecuaciones, traza la recta numérica para verificar el rango.', 'La factorización es más rápida que la fórmula cuando los coeficientes son pequeños.'],
  },
  {
    id: 'mat-geometria',
    label: 'Geometría',
    subject: 'm1',
    color: '#2dd4b2',
    theory: `Geometría PAES: áreas, perímetros, volúmenes y relaciones angulares.

**Áreas clave:**
- Triángulo: base × altura / 2
- Rectángulo: base × altura
- Círculo: π·r²
- Trapecio: (b₁+b₂) × h / 2

**Perímetros:**
- Círculo (circunferencia): 2πr

**Volúmenes:**
- Cubo: a³
- Paralelepípedo: l × a × h
- Cilindro: π·r²·h
- Esfera: (4/3)·π·r³

**Ángulos:**
- Suplementarios: suman 180°
- Complementarios: suman 90°
- Opuestos por vértice: son iguales
- Ángulos en triángulo: suman 180°`,
    tips: ['Dibuja siempre la figura antes de resolver.', 'Para sombras y partes de figuras, usa áreas totales menos partes conocidas.', 'Semejanza: lados en proporción → áreas en proporción al cuadrado.'],
  },
  {
    id: 'mat-probabilidad',
    label: 'Estadística y Probabilidad',
    subject: 'm1',
    color: '#f07272',
    theory: `Estadística descriptiva y probabilidad clásica para PAES M1.

**Medidas de tendencia central:**
- Media: Σxᵢ / n
- Mediana: valor central (si n par: promedio de los dos centrales)
- Moda: valor que más se repite

**Medidas de dispersión:**
- Rango: máximo − mínimo
- Varianza: Σ(xᵢ − x̄)² / n
- Desviación estándar: √varianza

**Probabilidad:**
- P(A) = casos favorables / casos totales
- P(A∪B) = P(A) + P(B) − P(A∩B)
- P(A∩B) = P(A) × P(B) si son independientes
- Complemento: P(Aᶜ) = 1 − P(A)

**Conteo:** Permutaciones = n!/(n−r)!. Combinaciones = n! / (r!(n−r)!)`,
    tips: ['Lee bien si los eventos son independientes o no antes de multiplicar.', 'Para probabilidad condicional: P(A|B) = P(A∩B)/P(B).', 'Diagramas de árbol o Venn ayudan a visualizar los casos.'],
  },
  {
    id: 'mat-m2-funciones',
    label: 'Funciones y Análisis',
    subject: 'm2',
    color: '#7c6ef5',
    theory: `Temas de M2: funciones, límites, derivadas e integrales.

**Funciones:**
- Dominio: conjunto de valores de x permitidos.
- Recorrido: conjunto de valores que toma f(x).
- Función inyectiva: cada y tiene a lo más un x.
- Función sobreyectiva: todo y del codominio tiene al menos un x.
- Función biyectiva: inyectiva + sobreyectiva → tiene inversa.

**Función cuadrática f(x) = ax²+bx+c:**
- Vértice: x = −b/(2a)
- Si a>0: mínimo; si a<0: máximo

**Función exponencial f(x) = bˣ:** creciente si b>1, decreciente si 0<b<1.
**Función logarítmica:** inversa de la exponencial. ln(x) = log_e(x).

**Derivada:** pendiente de la tangente. Reglas básicas:
- (xⁿ)ʹ = n·xⁿ⁻¹
- (f+g)ʹ = fʹ+gʹ
- Máximos/mínimos: fʹ(x)=0 y analizar signo de fʹʹ`,
    tips: ['Para encontrar el dominio: el denominador ≠ 0 y el radicando ≥ 0.', 'La derivada en un punto es la pendiente de la recta tangente en ese punto.', 'Si fʹ(x)>0 en un intervalo, f es creciente allí.'],
  },
  {
    id: 'cien-ondas',
    label: 'Ondas y Sonido',
    subject: 'ciencias',
    color: '#f0a740',
    theory: `Física de ondas para la PAES de Ciencias.

**Tipos de ondas:**
- Mecánicas: necesitan medio (sonido, agua).
- Electromagnéticas: no necesitan medio (luz, radio, rayos X).
- Transversales: vibración perpendicular a la dirección de propagación.
- Longitudinales: vibración paralela (sonido en el aire).

**Magnitudes:**
- Amplitud (A): desplazamiento máximo.
- Longitud de onda (λ): distancia entre dos crestas.
- Frecuencia (f): ciclos por segundo (Hz).
- Período (T): tiempo de un ciclo. T = 1/f.
- Velocidad: v = f·λ

**Sonido:**
- Velocidad en el aire a 20°C: ~343 m/s.
- Infrasónico: f < 20 Hz. Audible: 20–20.000 Hz. Ultrasónico: f > 20.000 Hz.
- Efecto Doppler: si la fuente se acerca, la frecuencia percibida aumenta.

**Luz:** espectro visible 400–700 nm. Rojo = λ mayor, frecuencia menor.`,
    tips: ['En ondas electromagnéticas, v = c = 3×10⁸ m/s en el vacío.', 'Frecuencia y longitud de onda son inversamente proporcionales.', 'El sonido NO se transmite en el vacío (es onda mecánica).'],
  },
  {
    id: 'cien-celula',
    label: 'La Célula',
    subject: 'ciencias',
    color: '#3ec97e',
    theory: `Biología celular para la PAES de Ciencias.

**Tipos de células:**
- Procariota: sin núcleo definido, sin organelos membranosos (bacterias).
- Eucariota: con núcleo y organelos (animal y vegetal).

**Organelos clave:**
- **Núcleo:** contiene el ADN; dirige las actividades celulares.
- **Mitocondria:** produce ATP (respiración celular). "Central energética".
- **Ribosoma:** síntesis de proteínas. En procariotas y eucariotas.
- **Retículo endoplasmático:** transporte y síntesis (rugoso: proteínas; liso: lípidos).
- **Aparato de Golgi:** modifica, empaqueta y distribuye proteínas.
- **Lisosoma:** digestión intracelular (solo en animales).
- **Cloroplasto:** fotosíntesis (solo en plantas y algas).
- **Vacuola:** almacenamiento (central en plantas).
- **Pared celular:** rigidez; en plantas (celulosa), hongos (quitina), bacterias (peptidoglicano).

**Transporte:**
- Pasivo: favor del gradiente, sin energía (difusión, ósmosis).
- Activo: contra el gradiente, con ATP (bomba Na⁺/K⁺).`,
    tips: ['Mitocondria → energía (ATP). Cloroplasto → fotosíntesis. Ribosoma → proteínas.', 'Osmosis: el agua se mueve del lugar hipotónico al hipertónico.', 'Procariota = sin núcleo = bacterias y arqueas.'],
  },
]

// ── BANCO DE EJERCICIOS ─────────────────────────────────────────────────────
// correct: índice de la opción correcta (0=A, 1=B, 2=C, 3=D)
export const EXERCISE_BANK = {

  'leng-localizar': [
    { id:'ll001', stem:'En el siguiente fragmento: "La expedición partió en 1492, llevaba 90 hombres y tres carabelas llamadas Niña, Pinta y Santa María." ¿Cuántos tripulantes llevaba la expedición?', options:['A) 3','B) 1492','C) 90','D) No se menciona'], correct:2, explanation:'El texto dice explícitamente "90 hombres". Las otras opciones son datos del texto pero no corresponden a la pregunta.' },
    { id:'ll002', stem:'Según el texto: "El volcán Ojos del Salado, con 6.893 metros, es el más alto de Chile." ¿Cuál es la altura del Ojos del Salado?', options:['A) 6.893 km','B) Es el más alto de América','C) 6.893 metros','D) No se indica su altura exacta'], correct:2, explanation:'El texto dice "6.893 metros". La opción A confunde la unidad (km ≠ metros).' },
    { id:'ll003', stem:'"El acto inaugural contó con la presencia de más de 500 invitados y duró exactamente tres horas." ¿Cuánto duró el acto inaugural?', options:['A) 500 horas','B) Tres horas','C) Más de tres horas','D) El texto no lo indica'], correct:1, explanation:'El texto dice "exactamente tres horas". La opción C es incorrecta porque el texto dice "exactamente".' },
    { id:'ll004', stem:'"La novela fue publicada en 1967 y recibió el Premio Nobel ese mismo año." ¿Cuándo se publicó la novela?', options:['A) En 1966','B) El año del Premio Nobel','C) En 1967','D) El texto no especifica'], correct:2, explanation:'El texto dice "fue publicada en 1967". Aunque B también es verdad, C es la respuesta más directa y específica.' },
    { id:'ll005', stem:'"El río Amazonas desemboca en el océano Atlántico y tiene una longitud aproximada de 6.400 km." ¿En qué océano desemboca el Amazonas?', options:['A) Océano Pacífico','B) Océano Índico','C) Mar Caribe','D) Océano Atlántico'], correct:3, explanation:'El texto indica explícitamente "océano Atlántico".' },
    { id:'ll006', stem:'"La directora del proyecto, Dra. Elena Vega, anunció que los resultados se publicarán en marzo." ¿Quién anunció los resultados?', options:['A) El director del proyecto','B) Elena Vega','C) El equipo del proyecto','D) No se menciona'], correct:1, explanation:'El texto dice "Dra. Elena Vega" anunció. La opción A es incorrecta (dice "director" y no "directora").' },
    { id:'ll007', stem:'"Se necesitan 8 vasos de agua al día para una hidratación adecuada, según el informe." ¿Cuántos vasos recomienda el informe?', options:['A) 6 vasos','B) Al menos 8','C) 8 vasos','D) El informe no da una cifra exacta'], correct:2, explanation:'El texto dice exactamente "8 vasos". B es incorrecto porque agrega "al menos" que el texto no dice.' },
    { id:'ll008', stem:'"El festival se celebra cada dos años en la ciudad de Valparaíso durante el mes de enero." ¿Con qué frecuencia se celebra el festival?', options:['A) Anualmente','B) En enero','C) En Valparaíso','D) Cada dos años'], correct:3, explanation:'"Cada dos años" es la frecuencia. Las opciones B y C son datos del texto pero no responden a "con qué frecuencia".' },
    { id:'ll009', stem:'"El edificio fue diseñado por el arquitecto Miguel Fernández y tardó cuatro años en construirse." ¿Quién diseñó el edificio?', options:['A) El equipo de arquitectos','B) Miguel Fernández','C) Fernández y asociados','D) El texto no lo especifica'], correct:1, explanation:'El texto menciona explícitamente "el arquitecto Miguel Fernández".' },
    { id:'ll010', stem:'"La temperatura máxima registrada en el desierto de Atacama fue de 42°C en el verano de 2019." ¿Cuál fue la temperatura máxima registrada?', options:['A) 40°C','B) 42°F','C) 42°C','D) El texto no da la temperatura'], correct:2, explanation:'El texto dice "42°C". La opción B confunde la unidad (°F ≠ °C).' },
  ],

  'leng-relacionar': [
    { id:'lr001', stem:'Lee el siguiente texto: "El proyecto fue aprobado sin problemas. Sin embargo, a los pocos días surgieron conflictos entre los socios." ¿Qué relación hay entre las dos ideas?', options:['A) Causa-efecto: la aprobación causó los conflictos','B) Contraste: la aprobación fácil contrasta con los problemas posteriores','C) Secuencia temporal sin relación lógica','D) Comparación entre dos proyectos'], correct:1, explanation:'El conector "sin embargo" marca contraste. La aprobación sin problemas se opone a los conflictos posteriores.' },
    { id:'lr002', stem:'"Las lluvias fueron escasas ese año. Como consecuencia, la producción agrícola cayó un 30%." ¿Qué tipo de relación se expresa?', options:['A) Contraste','B) Condición','C) Causa-efecto','D) Comparación'], correct:2, explanation:'"Como consecuencia" es un conector de causa-efecto. Las escasas lluvias causaron la caída en producción.' },
    { id:'lr003', stem:'"Ana estudia música mientras Pedro prefiere las artes plásticas. Ambos, sin embargo, comparten la pasión por la creación." ¿Cuál es la relación principal entre Ana y Pedro?', options:['A) Son iguales en todo','B) Difieren en disciplina pero comparten una pasión común','C) Ana es mejor que Pedro en artes','D) No tienen ninguna relación'], correct:1, explanation:'El texto presenta diferencias (música vs. plástica) pero también una similitud (pasión por la creación).' },
    { id:'lr004', stem:'"Si el gobierno reduce los impuestos, las empresas tendrán más capital para invertir." ¿Qué tipo de relación expresa esta oración?', options:['A) Causa-efecto real','B) Contraste','C) Condición-consecuencia','D) Comparación'], correct:2, explanation:'"Si... entonces" expresa condición. La reducción de impuestos es la condición; la inversión, la consecuencia posible.' },
    { id:'lr005', stem:'Texto: "El primer capítulo presenta a los personajes. Luego, en el segundo, se desarrolla el conflicto. Finalmente, el tercero resuelve todo." ¿Cómo se organiza la información?', options:['A) Por importancia','B) Por causa-efecto','C) Secuencialmente / cronológicamente','D) Por contraste'], correct:2, explanation:'Los conectores "primero", "luego" y "finalmente" indican organización secuencial.' },
    { id:'lr006', stem:'"La ciudad A tiene más habitantes que la B, pero la B tiene mayor densidad por km²." ¿Cuál es la relación?', options:['A) A es mejor que B en todo','B) Comparación con resultado mixto','C) A y B son idénticas','D) Causa-efecto'], correct:1, explanation:'Se comparan dos ciudades en dos dimensiones distintas: población total vs. densidad. Resultado mixto.' },
    { id:'lr007', stem:'"Aunque entrenó toda la semana, no logró mejorar su marca personal." ¿Qué expresa el conector "aunque"?', options:['A) Causa','B) Secuencia','C) Concesión (contraste inesperado)','D) Adición'], correct:2, explanation:'"Aunque" es un conector concesivo: el entrenamiento no tuvo el resultado esperado (concesión/contraste).' },
    { id:'lr008', stem:'Texto A: "La deforestación destruye ecosistemas." Texto B: "La deforestación genera empleos en zonas rurales." ¿Qué relación hay entre ambos textos?', options:['A) B contradice a A en todo','B) Perspectivas complementarias sobre el mismo fenómeno','C) A es correcto y B es falso','D) No tienen relación'], correct:1, explanation:'Ambos textos hablan de la deforestación pero desde perspectivas distintas (ambiental y económica), no contradictorias sino complementarias.' },
  ],

  'leng-caracterizar': [
    { id:'lc001', stem:'Texto: "Juan nunca llegaba a tiempo. Olvidaba los encargos y perdía sus cosas constantemente. Sus amigos ya no confiaban en él." ¿Cómo se puede caracterizar a Juan?', options:['A) Irresponsable','B) Deshonesto','C) Agresivo','D) Solitario'], correct:0, explanation:'Las acciones descritas (llegar tarde, olvidar, perder cosas) apuntan a irrespabilidad. No hay indicios de deshonestidad, agresividad o soledad.' },
    { id:'lc002', stem:'Texto: "A pesar de la derrota, la capitana mantuvo la calma. Consoló a su equipo y ya planeaba la estrategia para el próximo partido." ¿Cómo se caracteriza a la capitana?', options:['A) Arrogante','B) Resiliente y lideresa','C) Indiferente al resultado','D) Vengativa'], correct:1, explanation:'Mantener la calma, consolar al equipo y planear el futuro son rasgos de resiliencia y liderazgo.' },
    { id:'lc003', stem:'Texto: "La anciana observaba todo desde su ventana sin emitir palabra. Cuando alguien le preguntaba algo, respondía con evasivas." ¿Qué rasgo predomina?', options:['A) Comunicativa','B) Observadora pero reservada','C) Hostil','D) Ansiosa'], correct:1, explanation:'Observa sin hablar y responde con evasivas: es reservada (no hostil, ya que responde; no ansiosa, ya que observa en calma).' },
    { id:'lc004', stem:'"El detective revisó cada pista dos veces, anotó cada detalle y no descansó hasta tener una hipótesis sólida." ¿Cómo se caracteriza al detective?', options:['A) Impulsivo','B) Meticuloso y perseverante','C) Desconfiado de sus colegas','D) Emocionalmente inestable'], correct:1, explanation:'Revisar dos veces, anotar detalles y no descansar = meticulosidad y perseverancia. No hay evidencia de los otros rasgos.' },
    { id:'lc005', stem:'"Marta donaba parte de su sueldo cada mes, ayudaba a vecinos en dificultad y nunca aceptaba reconocimiento a cambio." ¿Cuál es el rasgo dominante de Marta?', options:['A) Calculadora','B) Altruista y discreta','C) Ingenua','D) Ambiciosa'], correct:1, explanation:'Donar, ayudar y rechazar reconocimiento = altruismo. La discreción se infiere de no aceptar reconocimiento.' },
  ],

  'mat-numeros': [
    { id:'mn001', stem:'¿Cuánto es 2/3 + 3/4?', options:['A) 5/7','B) 17/12','C) 5/12','D) 6/7'], correct:1, explanation:'MCD de 3 y 4 es 12. 2/3 = 8/12; 3/4 = 9/12. Suma = 17/12.' },
    { id:'mn002', stem:'Si el precio de un producto aumenta un 20% y luego disminuye un 20%, ¿cuál es el cambio porcentual total?', options:['A) 0% (queda igual)','B) Disminuye 4%','C) Aumenta 4%','D) Disminuye 10%'], correct:1, explanation:'100 × 1.20 = 120. 120 × 0.80 = 96. Variación = (96-100)/100 = -4%. No es 0% porque los porcentajes se aplican sobre distintas bases.' },
    { id:'mn003', stem:'¿Cuánto es 3⁴ − 2⁵?', options:['A) 81','B) 49','C) 1','D) 18'], correct:1, explanation:'3⁴ = 81. 2⁵ = 32. 81 − 32 = 49.' },
    { id:'mn004', stem:'¿Cuál es el 15% de 240?', options:['A) 24','B) 36','C) 48','D) 30'], correct:1, explanation:'15% de 240 = (15/100)×240 = 0.15×240 = 36.' },
    { id:'mn005', stem:'Si a/b = 3/5 y a + b = 160, ¿cuánto vale a?', options:['A) 48','B) 60','C) 64','D) 96'], correct:1, explanation:'a = 3k, b = 5k. 3k+5k = 8k = 160 → k = 20. a = 3×20 = 60.' },
    { id:'mn006', stem:'¿Cuál es la raíz cuadrada de 0.0144?', options:['A) 0.12','B) 0.012','C) 1.2','D) 0.36'], correct:0, explanation:'√0.0144 = √(144/10000) = 12/100 = 0.12.' },
    { id:'mn007', stem:'Un número aumentado en 40% da 98. ¿Cuál es el número original?', options:['A) 58.8','B) 70','C) 65','D) 72'], correct:1, explanation:'x × 1.40 = 98 → x = 98/1.40 = 70.' },
    { id:'mn008', stem:'¿Cuántos divisores tiene el número 36?', options:['A) 6','B) 7','C) 8','D) 9'], correct:3, explanation:'Divisores de 36: 1, 2, 3, 4, 6, 9, 12, 18, 36. Son 9 divisores.' },
    { id:'mn009', stem:'Si 5x = 3y, ¿cuál es la razón x:y?', options:['A) 5:3','B) 3:5','C) 1:1','D) 15:1'], correct:1, explanation:'5x = 3y → x/y = 3/5. Razón x:y = 3:5.' },
    { id:'mn010', stem:'¿Cuál es el valor de (2/3)⁻² ?', options:['A) 4/9','B) 9/4','C) 2/9','D) −9/4'], correct:1, explanation:'(2/3)⁻² = (3/2)² = 9/4.' },
    { id:'mn011', stem:'Un auto recorre 360 km en 4 horas. ¿A qué velocidad media va?', options:['A) 80 km/h','B) 90 km/h','C) 100 km/h','D) 85 km/h'], correct:1, explanation:'v = d/t = 360/4 = 90 km/h.' },
    { id:'mn012', stem:'¿Cuál es el MCM de 12 y 18?', options:['A) 6','B) 24','C) 36','D) 216'], correct:2, explanation:'12 = 2²×3. 18 = 2×3². MCM = 2²×3² = 36.' },
    { id:'mn013', stem:'Si 3/4 de un número es 45, ¿cuál es el número?', options:['A) 33.75','B) 48','C) 60','D) 56.25'], correct:2, explanation:'(3/4)x = 45 → x = 45 × (4/3) = 60.' },
    { id:'mn014', stem:'¿Cuál es el resultado de √(25 × 16)?', options:['A) √41','B) 20','C) 400','D) 41'], correct:1, explanation:'√(25 × 16) = √400 = 20. También: √25 × √16 = 5 × 4 = 20.' },
    { id:'mn015', stem:'Un descuento del 25% aplicado a un precio deja el artículo en $1.500. ¿Cuál era el precio original?', options:['A) $1.875','B) $1.875','C) $2.000','D) $2.250'], correct:2, explanation:'x × 0.75 = 1500 → x = 1500/0.75 = 2000.' },
  ],

  'mat-algebra': [
    { id:'ma001', stem:'Resuelve: 3x − 7 = 2x + 5', options:['A) x = 2','B) x = 12','C) x = −2','D) x = 12/5'], correct:1, explanation:'3x − 2x = 5 + 7 → x = 12.' },
    { id:'ma002', stem:'Factoriza: x² − 9', options:['A) (x−3)²','B) (x+3)(x−3)','C) (x−9)(x+1)','D) No factoriza'], correct:1, explanation:'x² − 9 = x² − 3² = (x+3)(x−3). Es diferencia de cuadrados.' },
    { id:'ma003', stem:'¿Cuáles son las raíces de x² − 5x + 6 = 0?', options:['A) x=2 y x=3','B) x=1 y x=6','C) x=−2 y x=−3','D) x=5 y x=1'], correct:0, explanation:'Factorizando: (x−2)(x−3) = 0 → x = 2 o x = 3. Verificación: 2+3=5 ✓, 2×3=6 ✓.' },
    { id:'ma004', stem:'Si f(x) = 2x² − 3x + 1, ¿cuánto es f(−1)?', options:['A) 6','B) 0','C) −4','D) 2'], correct:0, explanation:'f(−1) = 2(1) − 3(−1) + 1 = 2 + 3 + 1 = 6.' },
    { id:'ma005', stem:'Resuelve el sistema: x + y = 7 y 2x − y = 2', options:['A) x=2, y=5','B) x=3, y=4','C) x=5, y=2','D) x=4, y=3'], correct:1, explanation:'Sumando: 3x = 9 → x = 3. Luego y = 7−3 = 4.' },
    { id:'ma006', stem:'¿Para qué valores de x es verdad que 2x − 3 > 7?', options:['A) x > 2','B) x > 5','C) x < 5','D) x > 10'], correct:1, explanation:'2x > 10 → x > 5.' },
    { id:'ma007', stem:'Simplifica: (x² − 4) / (x − 2)', options:['A) x − 2','B) x + 2','C) x²','D) No simplifica'], correct:1, explanation:'x² − 4 = (x+2)(x−2). Dividiendo por (x−2): queda x+2 (con x ≠ 2).' },
    { id:'ma008', stem:'¿Cuánto es (a+b)² si a=3 y b=−2?', options:['A) 1','B) 25','C) 13','D) −1'], correct:0, explanation:'a+b = 3+(−2) = 1. (1)² = 1.' },
    { id:'ma009', stem:'Halla el discriminante de 2x² + 4x + 3 = 0. ¿Cuántas raíces reales tiene?', options:['A) D = 40, dos raíces','B) D = −8, sin raíces reales','C) D = 8, dos raíces','D) D = 0, una raíz doble'], correct:1, explanation:'D = b²−4ac = 16−24 = −8 < 0. Sin raíces reales.' },
    { id:'ma010', stem:'Si 2^x = 32, ¿cuánto es x?', options:['A) 4','B) 5','C) 6','D) 16'], correct:1, explanation:'32 = 2⁵ → x = 5.' },
    { id:'ma011', stem:'Expande: (2x − 3)²', options:['A) 4x² − 9','B) 2x² − 6x + 9','C) 4x² − 12x + 9','D) 4x² + 12x − 9'], correct:2, explanation:'(2x−3)² = (2x)² − 2(2x)(3) + 3² = 4x² − 12x + 9.' },
    { id:'ma012', stem:'¿Cuánto es el coeficiente de x en la expansión de (x+3)(2x−5)?', options:['A) 1','B) −5','C) 6','D) 1'], correct:3, explanation:'(x+3)(2x−5) = 2x² − 5x + 6x − 15 = 2x² + x − 15. Coeficiente de x = 1.' },
    { id:'ma013', stem:'La suma de dos números es 20 y su diferencia es 6. ¿Cuáles son?', options:['A) 12 y 8','B) 13 y 7','C) 14 y 6','D) 15 y 5'], correct:1, explanation:'x+y=20, x−y=6 → 2x=26 → x=13, y=7.' },
    { id:'ma014', stem:'Si x² − 2x − 3a = 0 tiene discriminante 16, ¿cuánto vale a?', options:['A) a = −1','B) a = 1','C) a = −2','D) a = 2'], correct:1, explanation:'D = b²−4ac = 4−4(1)(−3a) = 4+12a = 16 → 12a = 12 → a = 1.' },
    { id:'ma015', stem:'¿Para qué x es f(x) = x² − 4x + 3 igual a cero?', options:['A) x = 1 y x = 3','B) x = −1 y x = −3','C) x = 2 y x = 2','D) x = 4 y x = 0'], correct:0, explanation:'(x−1)(x−3) = 0 → x = 1 o x = 3. Verificación: 1−4+3=0 ✓; 9−12+3=0 ✓.' },
  ],

  'mat-geometria': [
    { id:'mg001', stem:'¿Cuál es el área de un triángulo con base 8 cm y altura 5 cm?', options:['A) 40 cm²','B) 20 cm²','C) 13 cm²','D) 80 cm²'], correct:1, explanation:'Área = base × altura / 2 = 8 × 5 / 2 = 20 cm².' },
    { id:'mg002', stem:'Un rectángulo tiene perimetro 30 cm y ancho 6 cm. ¿Cuánto mide su largo?', options:['A) 9 cm','B) 18 cm','C) 24 cm','D) 12 cm'], correct:0, explanation:'Perímetro = 2(l+a) → 30 = 2(l+6) → 15 = l+6 → l = 9 cm.' },
    { id:'mg003', stem:'¿Cuánto mide la hipotenusa de un triángulo rectángulo con catetos de 6 y 8?', options:['A) 14','B) 10','C) 7','D) 12'], correct:1, explanation:'c² = 6² + 8² = 36 + 64 = 100 → c = 10.' },
    { id:'mg004', stem:'¿Cuál es el área de un círculo con radio 7 cm? (π ≈ 3.14)', options:['A) 43.96 cm²','B) 21.98 cm²','C) 153.86 cm²','D) 49 cm²'], correct:2, explanation:'Área = π·r² = 3.14 × 49 = 153.86 cm².' },
    { id:'mg005', stem:'Dos ángulos son suplementarios. Si uno mide 70°, ¿cuánto mide el otro?', options:['A) 20°','B) 110°','C) 290°','D) 70°'], correct:1, explanation:'Suplementarios suman 180°. 180° − 70° = 110°.' },
    { id:'mg006', stem:'¿Cuál es el volumen de un cubo con arista de 4 cm?', options:['A) 16 cm³','B) 64 cm³','C) 48 cm³','D) 96 cm³'], correct:1, explanation:'Volumen = a³ = 4³ = 64 cm³.' },
    { id:'mg007', stem:'Un triángulo tiene ángulos de 45°, 90° y x°. ¿Cuánto es x?', options:['A) 45°','B) 90°','C) 135°','D) 30°'], correct:0, explanation:'Suma de ángulos = 180°. x = 180 − 90 − 45 = 45°.' },
    { id:'mg008', stem:'¿Cuál es el área de un trapecio con bases 10 y 6 cm, y altura 4 cm?', options:['A) 32 cm²','B) 40 cm²','C) 16 cm²','D) 24 cm²'], correct:0, explanation:'Área = (b₁+b₂)×h/2 = (10+6)×4/2 = 16×4/2 = 32 cm².' },
    { id:'mg009', stem:'La circunferencia de un círculo es 31.4 cm. ¿Cuánto mide su radio? (π ≈ 3.14)', options:['A) 5 cm','B) 10 cm','C) 15.7 cm','D) 3.14 cm'], correct:0, explanation:'C = 2πr → 31.4 = 2×3.14×r → r = 31.4/6.28 = 5 cm.' },
    { id:'mg010', stem:'Dos triángulos son semejantes. El mayor tiene base 12 cm y el menor base 4 cm. Si el menor tiene área 6 cm², ¿cuál es el área del mayor?', options:['A) 18 cm²','B) 36 cm²','C) 54 cm²','D) 72 cm²'], correct:2, explanation:'Razón de lados = 12/4 = 3. Razón de áreas = 3² = 9. Área mayor = 6 × 9 = 54 cm².' },
    { id:'mg011', stem:'¿Cuánto mide el lado de un cuadrado cuyo perímetro es 52 cm?', options:['A) 26 cm','B) 16 cm','C) 13 cm','D) 10 cm'], correct:2, explanation:'Perímetro = 4×lado → lado = 52/4 = 13 cm.' },
    { id:'mg012', stem:'Un cilindro tiene radio 3 cm y altura 10 cm. ¿Cuál es su volumen? (π ≈ 3.14)', options:['A) 188.4 cm³','B) 94.2 cm³','C) 282.6 cm³','D) 942 cm³'], correct:2, explanation:'V = π·r²·h = 3.14 × 9 × 10 = 282.6 cm³.' },
    { id:'mg013', stem:'¿Cuál es el área del sector circular con radio 6 y ángulo central 90°? (π ≈ 3.14)', options:['A) 9.42 cm²','B) 28.26 cm²','C) 18.84 cm²','D) 56.52 cm²'], correct:1, explanation:'Área sector = (θ/360)·π·r² = (90/360)·3.14·36 = 0.25·113.04 = 28.26 cm².' },
    { id:'mg014', stem:'Dados los puntos A(0,0) y B(3,4), ¿cuál es la distancia AB?', options:['A) 7','B) 5','C) 12','D) √7'], correct:1, explanation:'d = √((3−0)² + (4−0)²) = √(9+16) = √25 = 5.' },
    { id:'mg015', stem:'Un rombo tiene diagonales de 8 y 6 cm. ¿Cuál es su área?', options:['A) 48 cm²','B) 14 cm²','C) 24 cm²','D) 28 cm²'], correct:2, explanation:'Área rombo = (d₁×d₂)/2 = (8×6)/2 = 48/2 = 24 cm².' },
  ],

  'mat-probabilidad': [
    { id:'mp001', stem:'Se lanza un dado de 6 caras. ¿Cuál es la probabilidad de obtener un número par?', options:['A) 1/6','B) 1/3','C) 1/2','D) 2/3'], correct:2, explanation:'Números pares: 2, 4, 6 → 3 casos. Total: 6. P = 3/6 = 1/2.' },
    { id:'mp002', stem:'En una bolsa hay 5 rojas, 3 azules y 2 verdes. ¿Cuál es la probabilidad de sacar una azul?', options:['A) 3/5','B) 3/8','C) 1/3','D) 3/10'], correct:3, explanation:'Total = 5+3+2 = 10. P(azul) = 3/10.' },
    { id:'mp003', stem:'¿Cuál es la media de los datos: 4, 7, 7, 9, 13?', options:['A) 7','B) 8','C) 9','D) 10'], correct:1, explanation:'Suma = 4+7+7+9+13 = 40. Media = 40/5 = 8.' },
    { id:'mp004', stem:'¿Cuál es la mediana de: 2, 5, 8, 11, 14, 17?', options:['A) 8','B) 9.5','C) 11','D) 8.5'], correct:1, explanation:'6 datos: valores centrales son el 3° y 4° (8 y 11). Mediana = (8+11)/2 = 9.5.' },
    { id:'mp005', stem:'Se lanza una moneda dos veces. ¿Cuál es la probabilidad de obtener dos caras?', options:['A) 1/2','B) 1/4','C) 1/3','D) 3/4'], correct:1, explanation:'P(cara) × P(cara) = 1/2 × 1/2 = 1/4. Espacio muestral: {CC, CS, SC, SS}.' },
    { id:'mp006', stem:'¿Cuántas permutaciones existen de 4 personas en 4 sillas distintas?', options:['A) 4','B) 16','C) 24','D) 12'], correct:2, explanation:'4! = 4×3×2×1 = 24.' },
    { id:'mp007', stem:'De 10 alumnos, ¿de cuántas formas se puede elegir un comité de 3?', options:['A) 30','B) 120','C) 720','D) 210'], correct:1, explanation:'C(10,3) = 10!/(3!·7!) = (10×9×8)/(3×2×1) = 120.' },
    { id:'mp008', stem:'Un jugador tiene 70% de probabilidad de anotar un tiro libre. ¿Cuál es la probabilidad de que falle dos consecutivos?', options:['A) 9%','B) 49%','C) 30%','D) 60%'], correct:0, explanation:'P(fallo) = 0.30. P(dos fallos) = 0.30 × 0.30 = 0.09 = 9%.' },
    { id:'mp009', stem:'La varianza de un conjunto de datos es 25. ¿Cuál es la desviación estándar?', options:['A) 25','B) 5','C) 625','D) 12.5'], correct:1, explanation:'Desviación estándar = √varianza = √25 = 5.' },
    { id:'mp010', stem:'De 200 estudiantes, 120 aprueban. ¿Cuál es la probabilidad de que un estudiante elegido al azar repruebe?', options:['A) 0.60','B) 0.40','C) 0.80','D) 0.20'], correct:1, explanation:'Reprobados = 200−120 = 80. P = 80/200 = 0.40.' },
    { id:'mp011', stem:'Datos: 3, 3, 5, 7, 9, 9, 9. ¿Cuál es la moda?', options:['A) 5','B) 7','C) 3','D) 9'], correct:3, explanation:'El 9 aparece 3 veces; el 3, 2 veces; el 5 y 7, una vez. Moda = 9.' },
    { id:'mp012', stem:'Se sacan 2 cartas de un mazo de 52 sin reemplazo. ¿Cuál es la probabilidad de que ambas sean ases?', options:['A) 1/221','B) 1/169','C) 4/52','D) 1/52'], correct:0, explanation:'P = (4/52)×(3/51) = 12/2652 = 1/221.' },
    { id:'mp013', stem:'Un histograma muestra: [0-10]: 5 alumnos, [10-20]: 15, [20-30]: 10. ¿Qué porcentaje está en [10-20]?', options:['A) 25%','B) 40%','C) 50%','D) 60%'], correct:2, explanation:'Total = 5+15+10 = 30. 15/30 = 50%.' },
    { id:'mp014', stem:'Si P(A) = 0.5, P(B) = 0.4 y A y B son mutuamente excluyentes, ¿cuál es P(A∪B)?', options:['A) 0.2','B) 0.9','C) 1.0','D) 0.1'], correct:1, explanation:'Si son mutuamente excluyentes: P(A∪B) = P(A)+P(B) = 0.5+0.4 = 0.9.' },
    { id:'mp015', stem:'¿Cuál es el rango de los datos: 12, 7, 23, 5, 19, 31?', options:['A) 26','B) 19','C) 31','D) 5'], correct:0, explanation:'Rango = máximo − mínimo = 31 − 5 = 26.' },
  ],

  'cien-ondas': [
    { id:'co001', stem:'¿Qué tipo de onda es el sonido en el aire?', options:['A) Transversal electromagnética','B) Longitudinal mecánica','C) Transversal mecánica','D) Electromagnética longitudinal'], correct:1, explanation:'El sonido es una onda mecánica (necesita medio) y longitudinal (la vibración es paralela a la dirección de propagación).' },
    { id:'co002', stem:'Si la frecuencia de una onda es 440 Hz y la velocidad del sonido es 340 m/s, ¿cuál es su longitud de onda?', options:['A) 1.3 m','B) 0.77 m','C) 440 m','D) 880 m'], correct:1, explanation:'λ = v/f = 340/440 ≈ 0.77 m.' },
    { id:'co003', stem:'¿Qué propiedad de una onda determina su tono (agudo/grave) en el sonido?', options:['A) Amplitud','B) Longitud de onda','C) Frecuencia','D) Velocidad'], correct:2, explanation:'La frecuencia determina el tono: alta frecuencia = sonido agudo; baja frecuencia = sonido grave.' },
    { id:'co004', stem:'Una onda de radio viaja en el vacío. ¿A qué velocidad lo hace?', options:['A) 340 m/s','B) 1480 m/s','C) 3×10⁸ m/s','D) Depende de la frecuencia'], correct:2, explanation:'Las ondas electromagnéticas (radio, luz, rayos X) viajan a c = 3×10⁸ m/s en el vacío.' },
    { id:'co005', stem:'¿Qué sucede con la frecuencia percibida si una fuente de sonido se acerca al oyente? (Efecto Doppler)', options:['A) Disminuye','B) Aumenta','C) No cambia','D) Desaparece'], correct:1, explanation:'Efecto Doppler: al acercarse la fuente, las ondas se comprimen y el oyente percibe mayor frecuencia.' },
    { id:'co006', stem:'La amplitud de una onda sonora está relacionada con:', options:['A) El tono','B) La velocidad','C) La intensidad (volumen)','D) La frecuencia'], correct:2, explanation:'La amplitud determina la intensidad o volumen del sonido. Mayor amplitud = mayor intensidad (más fuerte).' },
    { id:'co007', stem:'¿Cuál es el rango de frecuencias audible para el ser humano?', options:['A) 0-20 Hz','B) 20 Hz - 20.000 Hz','C) 20.000 Hz - 1 MHz','D) 1 Hz - 100 Hz'], correct:1, explanation:'El oído humano percibe frecuencias entre 20 Hz y 20.000 Hz. Por debajo: infrasónico; por encima: ultrasónico.' },
    { id:'co008', stem:'Un rayo de luz roja tiene mayor _____ que uno azul.', options:['A) frecuencia','B) energía','C) longitud de onda','D) velocidad'], correct:2, explanation:'Luz roja: λ ≈ 700 nm (mayor λ, menor f). Luz azul: λ ≈ 450 nm. En el vacío ambas tienen la misma velocidad c.' },
    { id:'co009', stem:'¿En qué medio viaja el sonido más rápido?', options:['A) Vacío','B) Aire','C) Agua','D) Madera sólida'], correct:3, explanation:'El sonido viaja más rápido en sólidos (madera, metales) que en líquidos o gases. En vacío no puede viajar.' },
    { id:'co010', stem:'El período T de una onda de 250 Hz es:', options:['A) 250 s','B) 0.004 s','C) 0.04 s','D) 2500 s'], correct:1, explanation:'T = 1/f = 1/250 = 0.004 s.' },
    { id:'co011', stem:'¿Qué propiedad de la onda se conserva al cambiar de medio (refracción)?', options:['A) Velocidad','B) Longitud de onda','C) Dirección','D) Frecuencia'], correct:3, explanation:'Al refractarse, la frecuencia se mantiene constante. Cambian velocidad y longitud de onda.' },
    { id:'co012', stem:'Una onda tiene longitud de onda de 0.5 m y período de 0.01 s. ¿Cuál es su velocidad?', options:['A) 5 m/s','B) 0.005 m/s','C) 50 m/s','D) 500 m/s'], correct:2, explanation:'v = λ/T = 0.5/0.01 = 50 m/s. También v = λ·f = 0.5 × (1/0.01) = 0.5 × 100 = 50 m/s.' },
  ],

  'cien-celula': [
    { id:'cc001', stem:'¿Cuál es la diferencia principal entre una célula procariota y una eucariota?', options:['A) La procariota tiene cloroplastos','B) La eucariota tiene material genético libre en el citoplasma','C) La procariota carece de núcleo definido','D) Ambas tienen núcleo organizado'], correct:2, explanation:'Las células procariotas (bacterias) no tienen núcleo definido ni membrana nuclear. Las eucariotas sí.' },
    { id:'cc002', stem:'¿En qué organelo se produce la mayor cantidad de ATP durante la respiración celular?', options:['A) Ribosoma','B) Mitocondria','C) Núcleo','D) Vacuola'], correct:1, explanation:'La mitocondria es la "central energética" donde ocurre la respiración aeróbica y se produce ATP.' },
    { id:'cc003', stem:'¿Dónde ocurre la fotosíntesis?', options:['A) Mitocondria','B) Ribosoma','C) Cloroplasto','D) Aparato de Golgi'], correct:2, explanation:'La fotosíntesis ocurre en los cloroplastos, organelos presentes en células vegetales y algas.' },
    { id:'cc004', stem:'El retículo endoplasmático rugoso (RER) tiene ribosomas y su función principal es:', options:['A) Producir ATP','B) Sintetizar y transportar proteínas','C) Digerir residuos celulares','D) Controlar el ciclo celular'], correct:1, explanation:'El RER tiene ribosomas adheridos y se encarga de sintetizar y transportar proteínas destinadas a secreción o membrana.' },
    { id:'cc005', stem:'¿Cuál es la función del aparato de Golgi?', options:['A) Producir energía','B) Sintetizar ADN','C) Modificar, empaquetar y distribuir proteínas','D) Realizar la fotosíntesis'], correct:2, explanation:'El Golgi modifica proteínas del RER, las empaqueta en vesículas y las distribuye hacia donde se necesiten.' },
    { id:'cc006', stem:'La ósmosis es el movimiento de:', options:['A) Solutos a favor del gradiente','B) Agua a través de una membrana semipermeable desde zona hipotónica a hipertónica','C) Proteínas entre organelos','D) Iones contra el gradiente con ATP'], correct:1, explanation:'Osmosis: agua se desplaza desde la zona de menor concentración de soluto (hipotónica) a la de mayor (hipertónica).' },
    { id:'cc007', stem:'¿Cuál de las siguientes células tiene lisosomas pero NO tiene cloroplastos?', options:['A) Célula vegetal','B) Célula bacteriana','C) Célula animal','D) Alga verde'], correct:2, explanation:'Las células animales tienen lisosomas pero no cloroplastos. Las vegetales tienen cloroplastos pero usualmente no lisosomas.' },
    { id:'cc008', stem:'¿Qué componente es exclusivo de la pared celular vegetal?', options:['A) Quitina','B) Peptidoglicano','C) Celulosa','D) Colesterol'], correct:2, explanation:'Celulosa = plantas. Quitina = hongos y artrópodos. Peptidoglicano = bacterias. Colesterol en membrana animal.' },
    { id:'cc009', stem:'El transporte activo requiere:', options:['A) Favor del gradiente de concentración','B) Solo membranas semipermeables','C) Energía en forma de ATP','D) Temperatura de 37°C'], correct:2, explanation:'El transporte activo mueve sustancias contra el gradiente y necesita ATP (energía). Ej: bomba Na⁺/K⁺.' },
    { id:'cc010', stem:'¿Cuál organelo sintetiza proteínas?', options:['A) Lisosoma','B) Mitocondria','C) Vacuola','D) Ribosoma'], correct:3, explanation:'Los ribosomas son los organelos responsables de la síntesis de proteínas. Están en todas las células.' },
    { id:'cc011', stem:'Una célula en una solución hipertónica:', options:['A) Absorbe agua y se hincha','B) Pierde agua y se encoge','C) No cambia de volumen','D) Se divide más rápido'], correct:1, explanation:'Hipertónica: mayor concentración de soluto fuera. El agua sale de la célula por ósmosis → la célula se encoge.' },
    { id:'cc012', stem:'¿Cuál es la función principal del núcleo celular?', options:['A) Producir ATP','B) Sintetizar lípidos','C) Contener el ADN y dirigir las actividades celulares','D) Digerir partículas grandes'], correct:2, explanation:'El núcleo contiene el ADN (información genética) y controla todas las actividades de la célula.' },
  ],
}

// ── TEXTOS PARA ENSAYOS DE COMPRENSIÓN LECTORA ─────────────────────────────
export const LENGUAJE_TEXTS = [
  {
    id:    'lt001',
    title: 'El tiempo libre y la productividad',
    text: `Durante décadas, el tiempo libre fue considerado el antónimo de la productividad. La lógica era simple: trabajar más horas equivalía a producir más. Sin embargo, investigaciones recientes han comenzado a cuestionar este paradigma.

Un estudio publicado en 2021 por la Universidad de Stanford reveló que los trabajadores que reducían su jornada laboral de diez a ocho horas diarias mantenían, en promedio, el mismo nivel de producción. Incluso en algunos casos, su rendimiento mejoraba notablemente. Los investigadores atribuyeron este fenómeno a que el descanso permite la consolidación de la memoria, la resolución creativa de problemas y la recuperación cognitiva.

El economista Juliet Schor, en su obra "La sobreexplotación en América", argumenta que la cultura del trabajo excesivo no solo es ineficiente, sino también perjudicial para la salud mental y física de los trabajadores. Schor propone que una redistribución del tiempo —menos horas laborales y más tiempo libre de calidad— generaría beneficios tanto económicos como sociales.

No obstante, quienes defienden la jornada extensa señalan que en sectores de alta demanda, reducir el tiempo de trabajo puede generar cuellos de botella y pérdidas de competitividad frente a mercados internacionales que operan bajo distintas lógicas.

La paradoja del tiempo libre reside, entonces, en que aquello que aparentemente resta productividad podría ser, en realidad, su condición de posibilidad.`,
    questions: [
      { id:'lt001q1', stem:'Según el estudio de Stanford mencionado en el texto, ¿qué ocurrió con la producción al reducir la jornada laboral?', options:['A) Disminuyó notablemente en todos los casos','B) Se mantuvo o incluso mejoró','C) Aumentó solo en empresas tecnológicas','D) El texto no menciona resultados concretos'], correct:1, explanation:'El texto dice que "mantenían el mismo nivel de producción" y que "en algunos casos su rendimiento mejoraba notablemente".' },
      { id:'lt001q2', stem:'¿Cuál es la función del último párrafo en el texto?', options:['A) Presentar una nueva investigación científica','B) Refutar el argumento de Juliet Schor','C) Sintetizar la tensión central del texto mediante una paradoja','D) Concluir que el tiempo libre es innecesario'], correct:2, explanation:'El párrafo final formula la "paradoja del tiempo libre": lo que parece restar productividad podría ser su condición. Sintetiza la tensión.' },
      { id:'lt001q3', stem:'¿Qué postura defienden quienes critican la reducción de jornada laboral?', options:['A) Que el descanso no tiene beneficios científicos','B) Que la salud mental no es relevante en el ámbito laboral','C) Que reducir horas puede causar pérdida de competitividad','D) Que Juliet Schor se equivoca en todos sus argumentos'], correct:2, explanation:'El texto dice que señalan el riesgo de "cuellos de botella y pérdidas de competitividad frente a mercados internacionales".' },
      { id:'lt001q4', stem:'¿Qué relación existe entre el párrafo 1 y el párrafo 2 del texto?', options:['A) El párrafo 2 ejemplifica con un caso concreto lo que el 1 plantea como paradigma a cuestionar','B) El párrafo 2 contradice completamente al párrafo 1','C) Ambos párrafos defienden la misma postura sin diferencia','D) El párrafo 2 introduce un tema nuevo sin relación'], correct:0, explanation:'El párrafo 1 presenta el paradigma tradicional y lo pone en cuestión; el párrafo 2 aporta evidencia (estudio Stanford) que lo cuestiona.' },
      { id:'lt001q5', stem:'¿Cuál es la tesis central del texto?', options:['A) Trabajar más horas siempre produce más resultados','B) El tiempo libre es incompatible con la productividad moderna','C) La relación entre tiempo libre y productividad es más compleja de lo que el paradigma tradicional sugiere','D) Juliet Schor es la única investigadora que ha estudiado este tema'], correct:2, explanation:'El texto no defiende ningún extremo; presenta evidencias y argumentos de ambos lados, mostrando que la relación es compleja.' },
    ],
  },
  {
    id:    'lt002',
    title: 'La memoria colectiva y los monumentos',
    text: `Los monumentos públicos son, entre otras cosas, dispositivos de memoria. Su función no es meramente decorativa: al levantar una figura en bronce o un obelisco en una plaza, una comunidad decide qué pasado merece ser recordado y de qué manera.

Pero la memoria es selectiva. Cada monumento es también un olvido: al erigir a ciertos próceres, se deja en la sombra a otros actores históricos cuya contribución pudo ser igualmente significativa. Esta selección no es neutral; responde a las relaciones de poder presentes en el momento en que se toma la decisión.

En los últimos años, numerosas ciudades del mundo han presenciado el derribo o la remoción de estatuas vinculadas a personajes históricamente controversiales —conquistadores, esclavistas, dictadores—. Estos actos han generado un debate encendido: ¿deben los monumentos reflejar los valores del presente o conservar el registro del pasado tal como fue?

Quienes abogan por la conservación argumentan que destruir o remover una estatua es borrar la historia, impedir que las generaciones futuras confronten su herencia. Quienes apoyan la remoción responden que mantenerlos en espacios de honor es una forma de celebración, no de memoria crítica.

Una posición intermedia propone trasladar las estatuas a museos o contextualizarlas con señalética que explique tanto los méritos como los crímenes del personaje representado. De este modo, se preserva el registro histórico sin convertirlo en homenaje acrítico.`,
    questions: [
      { id:'lt002q1', stem:'Según el texto, ¿cuál es la función principal de los monumentos públicos?', options:['A) Embellecimiento urbano','B) Actos políticos para ganar elecciones','C) Dispositivos para seleccionar y materializar una memoria colectiva','D) Registro imparcial de toda la historia'], correct:2, explanation:'El texto dice: "Los monumentos son dispositivos de memoria... al levantar una figura, una comunidad decide qué pasado merece ser recordado".' },
      { id:'lt002q2', stem:'¿Qué se afirma sobre la selectividad de la memoria en el segundo párrafo?', options:['A) Que todo monumento recuerda a todos los actores históricos por igual','B) Que erigir un monumento también implica un olvido de otros actores','C) Que la selección de monumentos es siempre neutral','D) Que la memoria colectiva es perfecta e imparcial'], correct:1, explanation:'"Cada monumento es también un olvido: al erigir a ciertos próceres, se deja en la sombra a otros actores históricos".' },
      { id:'lt002q3', stem:'¿Cuál es el argumento de quienes defienden conservar los monumentos controvertidos?', options:['A) Que los personajes representados son todos admirables','B) Que removerlos eliminaría el registro histórico','C) Que los museos no tienen espacio para recibirlos','D) Que la señalética es una solución suficiente'], correct:1, explanation:'"Destruir o remover una estatua es borrar la historia, impedir que las generaciones futuras confronten su herencia."' },
      { id:'lt002q4', stem:'¿Qué propone la "posición intermedia" mencionada en el último párrafo?', options:['A) Destruir todos los monumentos controversiales','B) No hacer nada y dejar los monumentos como están','C) Trasladar las estatuas a museos o contextualizarlas con información crítica','D) Votar democráticamente por cada monumento'], correct:2, explanation:'El texto propone "trasladar a museos o contextualizar con señalética que explique tanto méritos como crímenes".' },
      { id:'lt002q5', stem:'¿Qué función cumple la pregunta del tercer párrafo ("¿deben los monumentos reflejar...?")?', options:['A) Introduce la respuesta definitiva del autor','B) Presenta la tensión central del debate que el texto explora','C) Refuta la idea de que los monumentos tienen valor','D) Pide la opinión del lector sobre un tema político'], correct:1, explanation:'La pregunta no es retórica ni tiene respuesta directa en el texto. Introduce el dilema central que el resto del texto desarrolla.' },
    ],
  },
]
