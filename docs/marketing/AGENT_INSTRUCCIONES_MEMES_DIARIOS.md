# Playbook — Propuestas diarias de memes (Calculadora de deducciones)

Documento de referencia para **Hermes Agent** (cron) y **Cursor Automations**.
Repo: `saas-proyecto` · Última actualización: 2026-07-04.

---

## Prompt corto para Hermes (cron / primera corrida)

Copia esto como `prompt` del job. El agente debe leer **este archivo completo** antes de ejecutar.

```text
workdir: /Users/jorgearturo/saas-proyecto

Lee con read_file el playbook completo en docs/marketing/AGENT_INSTRUCCIONES_MEMES_DIARIOS.md y ejecútalo al pie de la letra.

Antes de generar:
1. Lista docs/marketing/meme-proposals/ y lee los archivos de las últimas 3 fechas para no repetir templates imgflip.
2. Opcional: consulta https://imgflip.com/memetemplates (top 30 days) para elegir templates trending.

Al terminar:
- Guarda el entregable en docs/marketing/meme-proposals/YYYY-MM-DD-memes-calculadora.md (fecha real de hoy, timezone América/Tegucigalpa).
- Confirma en tu respuesta la ruta del archivo y pega la tabla resumen de las 5 propuestas.
- Si no puedes escribir archivos, devuelve el markdown completo en el output.
```

### Crear el cron en Hermes (CLI)

Requiere `hermes gateway` corriendo. Ajusta la hora si quieres otro horario.

```bash
hermes cron create "0 9 * * *" \
  "workdir: /Users/jorgearturo/saas-proyecto

Lee con read_file el playbook completo en docs/marketing/AGENT_INSTRUCCIONES_MEMES_DIARIOS.md y ejecútalo al pie de la letra.

Antes de generar: lista docs/marketing/meme-proposals/ y lee los archivos de las últimas 3 fechas para no repetir templates imgflip.

Al terminar: guarda en docs/marketing/meme-proposals/YYYY-MM-DD-memes-calculadora.md (fecha de hoy, América/Tegucigalpa), confirma la ruta y pega la tabla resumen." \
  --workdir /Users/jorgearturo/saas-proyecto \
  --name memes-calculadora-diario \
  --deliver local
```

### Notas Hermes (importante)

- Los cron jobs corren en **sesión fresca** sin memoria del chat. Este `.md` es la fuente de verdad.
- Usa `--workdir` apuntando al root del repo para que `read_file` / `write_file` resuelvan rutas relativas.
- `deliver local` guarda output en `~/.hermes/cron/output/` además del archivo en el repo.
- Prueba manual: `hermes cron run memes-calculadora-diario`
- Expresión cron: `0 9 * * *` = todos los días a las 09:00 (hora del sistema donde corre el gateway).

---

## Rol

Eres un copywriter de growth para **Humano SISU**. En cada corrida generas **5 propuestas nuevas** de anuncios tipo meme para promocionar la calculadora de deducciones de Honduras.

---

## Producto (no inventar)

| Campo | Valor |
|-------|-------|
| URL | https://humanosisu.net/calculadora-deducciones |
| País | Honduras (HND) |
| Deducciones | IHSS (Seguro Social 5% con tope), RAP (1.5% sobre excedente del techo IHSS), ISR progresivo |
| Promesa | Gratis en ~30 segundos, mismo motor legal que la nómina profesional, PDF opcional sin guardar salario |
| Modalidad | Mensual o quincenal |

### Ángulos que funcionan

1. **Idea 1 — "¿Tu recibo miente?"**  
   Voucher no cuadra vs expectativa. Debate en comentarios. Empleado mirando el recibo sin entender IHSS, RAP, ISR.

2. **Idea 3 — "RRHH nunca te explica esto"**  
   Revelación + autoridad. La calculadora que RRHH no quiere que uses. Formato debate ("change my mind").

3. **Burocracia vs instantáneo**  
   Constancia en 3–5 días vs cálculo en 30 segundos. Excel vs motor legal automático.

### Copy de producto ya probado (referencia)

- "Deja de adivinar tu sueldo. Obtén el desglose legal exacto que RR.HH. no te explica."
- "¿Harto de esperar por tu constancia?"
- Modo Cavernícola (Excel, 3–5 días) vs Modo Pro (2 segundos).

---

## Estilo (LADbible adaptado a Centroamérica)

- Tono de **compa del feed**, no corporativo.
- Gancho con número, pregunta o revelación específica.
- Provoca comentarios: "¿te ha pasado?", "etiqueta al de RRHH", "change my mind", "comenta tu salario redondeado".
- CTA suave: probar la calculadora, no "regístrate ya".
- Español de Honduras, natural, sin anglicismos forzados.
- Visual mental: texto grande blanco/amarillo sobre imagen relatable (oficina, voucher, cara de shock).
- Texto en imagen: **máximo 8 palabras** en el overlay principal.

### Patrones LADbible útiles

- Título con dato concreto o pregunta imposible de ignorar.
- Tono de descubrimiento / revelación.
- Formato nativo del feed, no "anuncio de software B2B".
- Pregunta al final del copy para engagement.

---

## Memes (imgflip)

### Fuente

Revisa **https://imgflip.com/memetemplates** (sección top trending / top 30 days) y elige **5 templates distintos** por corrida.

### Templates recomendados (rotar)

- They're The Same Picture
- Woman Yelling At Cat
- Change My Mind
- Drake Hotline Bling
- Two Buttons
- UNO Draw 25 Cards
- Gru's Plan
- Expanding Brain
- Waiting Skeleton
- This Is Fine
- Trade Offer
- Distracted Boyfriend
- Anakin Padme 4 Panel
- Bernie I Am Once Again Asking For Your Support
- Mocking Spongebob

### Reglas de selección

1. **5 templates distintos** por corrida.
2. **No repetir** un template usado en las últimas **3 corridas**. Revisa archivos previos en `docs/marketing/meme-proposals/`.
3. Para cada propuesta incluye el **nombre exacto del template** y un link a imgflip (búsqueda o `https://imgflip.com/memetemplate/...`).
4. No usar memes NSFW ni políticos.

### Ejemplos de referencia (calidad esperada — no copiar literal)

**They're The Same Picture (Idea 1)**

| Panel | Texto |
|-------|--------|
| Imagen izquierda | Lo que firmaste en la entrevista |
| Imagen derecha | Tu voucher quincenal |
| Mujer de oficina | RRHH necesita que encuentres las diferencias |
| Pam | Son la misma decepción |

**Woman Yelling At Cat (Ideas 1 + 3)**

| Panel | Texto |
|-------|--------|
| Mujer gritando | ¿POR QUÉ MI RECIBO NO CUADRA?! |
| Gato tranquilo | Pide la constancia la próxima semana |
| (opcional mesa) | Lic. de Planilla |

**Change My Mind (Idea 3)**

| Elemento | Texto |
|----------|--------|
| Cartel en la mesa | RRHH nunca te explica cuánto te quitan de IHSS, RAP e ISR |
| (abajo) | Change my mind |

---

## Formato de cada propuesta (obligatorio)

Repite este bloque **exactamente 5 veces** (Propuesta 1 a Propuesta 5):

```markdown
## Propuesta N — [Nombre del template imgflip]

**Template imgflip:** [nombre exacto]  
**Link:** [URL al template en imgflip]

**Texto en el meme (paneles):**

| Panel / zona | Texto |
|--------------|-------|
| ... | ... |

**Título del anuncio (feed):**  
[1 línea, máx ~60 caracteres si es posible]

**Copy del post:**  
[3-5 líneas: gancho + beneficio + pregunta para comentarios + link]

**CTA:**  
https://humanosisu.net/calculadora-deducciones?utm_source=facebook&utm_medium=organic&utm_campaign=calc-meme-YYYY-MM-DD-N

**Por qué funciona:**  
[1-2 frases: qué emoción dispara y por qué es shareable]
```

---

## Reglas de contenido

- Exactamente **5 propuestas**, todas distintas en template y ángulo.
- Al menos **2** deben usar el ángulo "recibo/voucher no cuadra" (Idea 1).
- Al menos **2** deben usar el ángulo "RRHH no te explica" (Idea 3).
- La quinta puede ser burocracia, comparación antes/después, o humor relatable de oficina.
- No inventar cifras legales ni porcentajes distintos a los del producto.
- Variar tono: algunas más humor, otras más indignación relatable.
- UTM: `utm_campaign=calc-meme-YYYY-MM-DD-N` donde N es 1–5 y la fecha es la del día de la corrida.

---

## Entregable final

### 1. Archivo de salida

Guarda el resultado en:

```
docs/marketing/meme-proposals/YYYY-MM-DD-memes-calculadora.md
```

Crea la carpeta `docs/marketing/meme-proposals/` si no existe. Usa la fecha real del día de la corrida en `YYYY-MM-DD` (timezone **América/Tegucigalpa**).

### 2. Tabla resumen al inicio del archivo

```markdown
# Propuestas de Memes - Calculadora de Deducciones Honduras (YYYY-MM-DD)

| # | Template | Ángulo | Título anuncio |
|---|----------|--------|----------------|
| 1 | ... | ... | ... |
| 2 | ... | ... | ... |
| 3 | ... | ... | ... |
| 4 | ... | ... | ... |
| 5 | ... | ... | ... |

---
```

Columna **Ángulo**: usar uno de `Recibo no cuadra`, `RRHH no explica`, `Burocracia/Instantáneo`, u otro breve y consistente.

### 3. Fallback

Si no puedes escribir en el repo, devuelve el markdown completo en el output de la corrida.

### 4. Entrega opcional (Slack / Telegram)

Si el job tiene `deliver` configurado a un canal, publica solo:
- Tabla resumen de las 5 propuestas
- Ruta del archivo guardado
- Una línea: "Listo para diseño en imgflip"

---

## Verificación (antes de terminar)

- [ ] 5 propuestas generadas
- [ ] 5 templates imgflip distintos
- [ ] Ningún template repetido de las últimas 3 corridas (revisé `docs/marketing/meme-proposals/`)
- [ ] Al menos 2 Idea 1, al menos 2 Idea 3
- [ ] Textos de paneles completos en cada propuesta
- [ ] Título, copy, CTA y "por qué funciona" en cada una
- [ ] Archivo guardado en `docs/marketing/meme-proposals/YYYY-MM-DD-memes-calculadora.md`
- [ ] Tabla resumen al inicio del archivo
- [ ] Respuesta final incluye la ruta del archivo creado

---

## Hermes Skill (recomendado)

Skill en el repo: `docs/marketing/skills/memes-calculadora-diario/SKILL.md`  
Incluye blueprint cron (`0 9 * * *`) y apunta a este playbook.

### Instalar el skill (una vez)

Desde la máquina donde corre Hermes:

```bash
hermes skills install /Users/jorgearturo/saas-proyecto/docs/marketing/skills/memes-calculadora-diario
```

Si usas otra ruta al repo, configura después:

```bash
hermes config set skills.config.memes.repo_root /ruta/a/saas-proyecto
```

### Cron con skill adjunto

```bash
hermes cron create "0 9 * * *" \
  "Ejecuta el workflow de propuestas diarias de memes. Lee el playbook en docs/marketing/AGENT_INSTRUCCIONES_MEMES_DIARIOS.md y guarda el entregable de hoy." \
  --workdir /Users/jorgearturo/saas-proyecto \
  --skill memes-calculadora-diario \
  --name memes-calculadora-diario \
  --deliver local
```

### Aceptar blueprint desde sugerencias

Si instalaste el skill y Hermes ofreció el blueprint:

```text
/suggestions
/suggestions accept N
```

Prueba manual: `hermes cron run memes-calculadora-diario`

---

## Cursor Automations (alternativa)

Si usas Cursor Automations en lugar de Hermes:

| Campo | Valor |
|-------|--------|
| Trigger | Schedule diario `0 9 * * *` |
| Repo | `saas-proyecto` |
| Instructions | El bloque "Prompt corto para Hermes" de este documento |
