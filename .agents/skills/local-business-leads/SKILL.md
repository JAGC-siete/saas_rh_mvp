---
name: local-business-leads
description: >-
  Busca, verifica y lista teléfonos/celulares comerciales y emails en Honduras.
  Modo local: comercios por ciudad/rubro. Modo corporativo: empresas multi-ciudad
  (~50+ empleados, presencia ≥2 ciudades) en escuelas, ferreterías, línea blanca,
  electrodomésticos u otros. Use when the user asks for leads, contactos, emails,
  celulares comerciales, prospección B2B, o JSON para Super Admin → Prospección.
---

# Local Business Leads

Skill paramétrica de prospección B2B en Honduras. El usuario define el **modo** y los filtros.

## Modos

### Modo A — Local (ciudad + rubro)

| Parámetro | Obligatorio | Ejemplo |
|-----------|-------------|---------|
| `ciudad` | sí | Siguatepeque |
| `departamento_o_region` | recomendado | Comayagua |
| `rubros` | sí | ferreterías, agroferreterías |
| `pais` | default HN | Honduras |

### Modo B — Corporativo multi-ciudad

Buscar **emails y celulares comerciales verificables** de empresas en Honduras que cumplan:

| Filtro | Regla |
|--------|--------|
| Tamaño | Señales de **≥ ~50 empleados** (cadena, multi-sucursal, universidad, retail nacional) — no inventar headcount exacto; anotar evidencia |
| Cobertura | Presencia en **≥ 2 ciudades** |
| Sectores prioritarios | Escuelas / universidades; ferreterías; línea blanca; electrodomésticos; afines |
| Contacto | Priorizar **email + celular/WhatsApp comercial** publicados en sitio oficial |
| Verificación | ≥2 fuentes o 1 sitio oficial con página de contacto/tiendas |

Si faltan filtros (sectores o umbral), preguntar. País default: Honduras.

## Query canónica Modo A (Siguatepeque / ferretero)

> i need you to search for contact number and mail of "ferreterias", "agroferreterias", "comercial ferretero" en Siguatepeque, Comayagua. haz una busqueda general. luego con verificacion cruzada intenta verificar que los comercios y contactos son reales. y tercero genera una lista de los principales comercios en la ciudad en ese sector o rubro.

## Query canónica Modo B (corporativo)

> Busca emails y números de celular comerciales en Honduras, priorizando verificables. Sectores: escuelas, ferreterías, comercios de línea blanca y electrodomésticos. En general empresas con más de 50 empleados y presencia en al menos 2 ciudades. No inventar contactos. Entregar tabla + JSON para Prospección.

## Workflow (3 fases obligatorias)

```
Leads Progress:
- [ ] Fase 1: Búsqueda general
- [ ] Fase 2: Verificación cruzada
- [ ] Fase 3: Lista de principales
- [ ] Export JSON Super Admin
```

### Fase 1 — Búsqueda general

**Modo A:** Maps, directorios, sitios .hn. Queries:
- `"{rubro}" "{ciudad}" {departamento} teléfono`
- `"{rubro}" "{ciudad}" email OR correo OR whatsapp`
- `"{rubro}" "{ciudad}" horario OR dirección`

**Modo B:** sitios oficiales (`/tiendas`, `/contacto`, `/ubicanos`), campus/admisiones. Queries:
- `"{marca}" Honduras WhatsApp OR celular ventas`
- `"{marca}" email OR correo contacto sucursales`
- `"{sector}" Tegucigalpa "San Pedro Sula" (sucursales OR tiendas OR campus)`

Recolectar: comercio, sector, email, celular/WA, PBX, ciudades, fuentes, notas de tamaño. **No inventar.** En tabla markdown, faltantes = `sin_dato`.

### Fase 2 — Verificación cruzada

Cruzar ≥2 fuentes cuando sea posible. Confianza:

- `alta` — ≥2 fuentes coherentes o sitio oficial de contacto + tiendas
- `media` — 1 fuente sólida (sitio/Maps) o datos parciales
- `baja` — solo agregador
- `descartado` — contradicción / fuera de alcance

Reglas extra Modo B:

- Confirmar **≥2 ciudades**.
- Preferir celular/WA comercial (ventas, admisiones, servicio) sobre solo PBX.
- Preferir dominio propio; no emails de agregadores.
- No usar emails personales de LinkedIn salvo pedido explícito.
- Preferir números HN (`+504` / 8 dígitos locales).

### Fase 3 — Lista de principales

Ordenar: confianza desc → email+celular → cobertura → nombre.

En `notas`: ciudades clave + evidencia de tamaño (p. ej. “13 campus”, “tiendas nacionales”).

## Formato de salida (tabla + JSON UI)

Siempre: (1) tabla markdown (2) resumen (3) JSON copiable.

```markdown
| # | Comercio | Rubro | Teléfono | Email | Dirección / zona | Confianza | Fuentes | Notas |
|---|----------|-------|----------|-------|------------------|-----------|---------|-------|
| 1 | ... | ... | +504... | ...@... | ... | alta | sitio | ... |
```

```markdown
### Resumen
- Candidatos: N
- Alta/media: N
- Sin teléfono: N
- Sin email: N
- Limitaciones: [...]
```

JSON (schema UI):

```json
[
  {
    "comercio": "Ejemplo Cadena",
    "rubro": "electrodomésticos",
    "telefono": "+504 9999-0000",
    "email": "ventas@ejemplo.hn",
    "direccion": "Multi-ciudad HN",
    "confianza": "alta",
    "fuentes": "sitio/contacto; sitio/tiendas",
    "notas": "Ciudades: SPS, TGU. Cel/WA comercial. Evidencia tamaño: N sucursales"
  }
]
```

Reglas JSON: array u `{ "candidates": [] }`; `confianza` ∈ alta|media|baja|descartado; faltantes = `null` (nunca `"sin_dato"`); solo alta/media salvo pedido; sin inventar.

> Pegar en Super Admin → Prospección leads → paso 1 → Cargar JSON pegado.

Modo B en UI: corrida `ciudad=Honduras` / `departamento=Multi-ciudad`, o una corrida por sede.

## Herramientas

- Web search + fetch de páginas públicas; browser MCP si el snippet no basta.
- No llamar ni mensajear comercios.
- No hardcodear secretos; no inventar contactos.

## Anti-patrones

- No devolver leads sin Fase 2.
- No marcar `alta` con una sola mención de scraper.
- No rellenar email/teléfono “probable”.
- No mezclar sedes de otras ciudades sin confirmar.
- No entregar solo tabla sin JSON (salvo que el usuario lo prohíba).
- Modo B: no incluir empresas de una sola ciudad aunque tengan buen contacto.
