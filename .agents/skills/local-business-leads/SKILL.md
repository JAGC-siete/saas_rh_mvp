---
name: local-business-leads
description: >-
  Busca, verifica y lista teléfonos y emails de comercios locales por ciudad y
  rubro (ferreterías, agroferreterías, comercial ferretero u otros). Use when
  the user asks for leads, contactos, teléfonos, emails, o lista de comercios
  en una ciudad; también cuando pide prospección B2B local o verificación de
  negocios reales.
---

# Local Business Leads

Skill paramétrica de prospección B2B local. Ciudad y rubro los define el usuario en cada uso.

## Parámetros

Extraer del mensaje del usuario (si falta alguno, preguntar antes de buscar):

| Parámetro | Obligatorio | Ejemplo |
|-----------|-------------|---------|
| `ciudad` | sí | Siguatepeque |
| `departamento_o_region` | recomendado | Comayagua |
| `rubros` | sí | ferreterías, agroferreterías, comercial ferretero |
| `pais` | default HN | Honduras |

## Query canónica (usar verbatim cuando aplique)

Si el usuario pide el caso Siguatepeque / ferretero, ejecutar exactamente este brief:

> i need you to search for contact number and mail of "ferreterias", "agroferreterias", "comercial ferretero" en Siguatepeque, Comayagua. haz una busqueda general. luego con verificacion cruzada intenta verificar que los comercios y contactos son reales. y tercero genera una lista de los principales comercios en la ciudad en ese sector o rubro.

Para otros casos, adaptar el mismo brief sustituyendo rubros, ciudad y región.

## Workflow (3 fases obligatorias)

Copiar y marcar progreso:

```
Leads Progress:
- [ ] Fase 1: Búsqueda general
- [ ] Fase 2: Verificación cruzada
- [ ] Fase 3: Lista de principales comercios
```

### Fase 1 — Búsqueda general

1. Buscar en web (Google, Bing, directorios, Facebook/Instagram Business, Google Maps/Business, Páginas Amarillas, sitios .hn, marketplaces locales).
2. Queries mínimas (variar en español):
   - `"{rubro}" "{ciudad}" {departamento} teléfono`
   - `"{rubro}" "{ciudad}" email OR correo OR "whatsapp"`
   - `"{rubro}" "{ciudad}" "horario" OR dirección`
   - `"comercial ferretero" "{ciudad}"` (y sinónimos del rubro)
3. Recolectar candidatos crudos: nombre comercial, teléfono, email, dirección/barrio, URL fuente, notas.
4. No inventar contactos. Si no hay teléfono/email, dejar celda vacía y marcar `sin_dato`.

### Fase 2 — Verificación cruzada

Para cada candidato, cruzar **al menos 2 fuentes independientes** cuando sea posible:

| Señal | Ejemplos de fuente |
|-------|--------------------|
| Nombre + ubicación | Google Maps, Facebook, sitio propio |
| Teléfono | Directorio + red social / sitio |
| Email | Sitio / anuncio / directorio |
| Actividad reciente | Posts, reseñas, horarios actualizados |

Asignar `confianza`:

- `alta` — ≥2 fuentes coherentes (mismo nombre/ciudad + mismo teléfono o email)
- `media` — 1 fuente sólida (Maps/sitio) o 2 fuentes con datos parciales
- `baja` — solo mención en listado agregado / sin corroboración
- `descartado` — contradicción fuerte, fuera de ciudad, o parece spam/agregador falso

Reglas:

- Preferir números HN (`+504` / `504` / locales 8 dígitos).
- Descartar emails genéricos de agregadores si no aparecen en el comercio (`info@directorio...` sin presencia propia).
- Si el teléfono/email no cuadra con el nombre/ciudad en otra fuente, bajar a `baja` o `descartado`.
- Anotar en `fuentes` URLs o nombres de directorios usados (sin pegar PII sensible de terceros no públicos).

### Fase 3 — Lista de principales comercios

Seleccionar los principales del rubro en la ciudad según:

1. Verificación `alta` o `media`
2. Relevancia al rubro (no mezclar si no es ferretero/agroferretero/etc.)
3. Señales de tamaño/presencia (sede, reseñas, cadena local, surtido amplio) cuando existan

Ordenar: `confianza` desc, luego nombre A–Z.

## Formato de salida (solo tabla markdown)

Entregar **una** tabla markdown principal. No CSV salvo que el usuario lo pida después.

```markdown
| # | Comercio | Rubro | Teléfono | Email | Dirección / zona | Confianza | Fuentes | Notas |
|---|----------|-------|----------|-------|------------------|-----------|---------|-------|
| 1 | ... | ferretería | +504... | ...@... | ... | alta | Maps; FB | ... |
```

Después de la tabla, un bloque corto:

```markdown
### Resumen
- Candidatos encontrados: N
- Verificados alta/media: N
- Sin teléfono: N
- Sin email: N
- Limitaciones: [qué no se pudo verificar]
```

## Herramientas

- Usar búsqueda web y fetch de páginas públicas.
- Si hay browser MCP disponible, usarlo para Maps/directorios cuando el snippet sea insuficiente.
- No llamar ni mensajear comercios. Solo datos públicos.
- No hardcodear ni exponer secretos; no inventar contactos.

## Anti-patrones

- No devolver leads sin pasar por Fase 2.
- No marcar `alta` con una sola mención de blog/SEO scraper.
- No rellenar email/teléfono “probable”.
- No mezclar comercios de otras ciudades con el mismo nombre sin confirmar ubicación.
