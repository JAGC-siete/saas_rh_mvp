---
name: ferreteria-outreach-resend
description: >-
  Envía por Resend el correo de prospección RRHH a emails de ferreterías /
  agroferreterías / comercial ferretero obtenidos de local-business-leads.
  Use when the user asks to send outreach, cold email, correo de demo RRHH,
  o contactar leads ferreteros con Resend.
---

# Ferretería Outreach (Resend)

Envía el correo canónico de prospección SISU a todos los emails válidos de una corrida de leads.

## Prerrequisitos

- `RESEND_API_KEY` en el entorno (nunca hardcodear).
- Remitente vía `getResendFromContact()` (`RESEND_FROM_CONTACT` / `RESEND_FROM` o default `SISU <humanosisu@humanosisu.net>`).
- Lista de emails de `local-business-leads` (solo celdas con email real; ignorar `sin_dato`).

## Correo canónico (verbatim)

**Asunto:**

```
¿Problemas de recursos humanos?
```

**Cuerpo:**

```
Hola, espero que estén teniendo una buena semana.

Encontré su ferretería mientras buscaba comercios en Siguatepeque y pensé en presentarme.

Desarrollamos un sistema simple de RRHH para comercios y ferreterías. Sirve para controlar asistencia, manejar vacaciones y tener la nómina y deducciones más ordenada, sin complicaciones manuales.

Si les interesa, puedo mostrarles cómo funciona en una demo rápida de 10 minutos (sin ningún compromiso). 

¿Les gustaría que les envíe más información o agendar una demostración en su comercio? Que tengan un gran día.
```

### Sustitución de ciudad

Si la corrida no es Siguatepeque, reemplazar **solo** la palabra `Siguatepeque` en la línea:

`Encontré su ferretería mientras buscaba comercios en Siguatepeque y pensé en presentarme.`

por la ciudad de la corrida (ej. `Comayagua`). No alterar el resto del copy.

## Workflow

```
Outreach Progress:
- [ ] 1. Recolectar emails válidos de la tabla de leads
- [ ] 2. Mostrar lista + asunto + cuerpo (preview)
- [ ] 3. Dry-run (default)
- [ ] 4. Esperar confirmación explícita del usuario para --send
- [ ] 5. Enviar con Resend y reportar resultados
```

### 1. Recolectar emails

De la última tabla de `local-business-leads` (o lista que pase el usuario):

- Incluir solo emails con `@` reales.
- Deduplicar (case-insensitive).
- Preferir confianza `alta` / `media`; preguntar antes de incluir `baja`.
- Excluir emails de agregadores genéricos sin vínculo al comercio.
- Excluir `sac@…` corporativos multi-país salvo que el usuario los apruebe.

### 2. Preview obligatorio

Antes de cualquier envío, mostrar:

| # | Comercio | Email | Ciudad |
|---|----------|-------|--------|
| … | … | … | … |

y el asunto + cuerpo finales (con ciudad ya sustituida).

### 3–4. Dry-run vs send

- **Default = dry-run** (no llama a Resend o usa modo preview del script).
- **Live send** solo si el usuario dice explícitamente algo como: `envía`, `mándalos`, `send real`, o aprueba `--send`.
- No enviar en silencio.

### 5. Ejecutar script

```bash
# Preview / dry-run
npx tsx scripts/send-ferreteria-outreach.ts --ciudad "Siguatepeque" --emails "a@x.com,b@y.com"

# Envío real (requiere confirmación del usuario en el chat)
npx tsx scripts/send-ferreteria-outreach.ts --ciudad "Siguatepeque" --emails "a@x.com,b@y.com" --send
```

También acepta `--file path.json` con forma:

```json
[{ "comercio": "…", "email": "…", "ciudad": "Siguatepeque" }]
```

Si falta `RESEND_API_KEY`, usar `railway run npx tsx …` cuando el key viva en Railway.

### Rate limit

Entre emails live: pausa ≥ 800ms. Si Resend rate-limita, esperar y reintentar 1 vez.

## Reporte final

```markdown
| # | Email | Estado | id Resend / error |
|---|-------|--------|-------------------|
| 1 | … | enviado / dry-run / error | … |

### Resumen
- Destinatarios: N
- Enviados: N
- Errores: N
- Modo: dry-run | live
```

## Anti-patrones

- No inventar emails.
- No hardcodear `RESEND_API_KEY` ni pegar secretos en el chat.
- No cambiar el asunto/cuerpo salvo la ciudad indicada arriba.
- No hacer `--send` sin confirmación explícita del usuario.
- No mezclar leads de otra ciudad en el mismo blast sin preview.
