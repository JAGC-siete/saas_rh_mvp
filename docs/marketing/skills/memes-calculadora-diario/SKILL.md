---
name: memes-calculadora-diario
description: Genera 5 propuestas diarias de memes estilo LADbible para la calculadora de deducciones Honduras (Humano SISU).
version: 1.0.0
author: Humano SISU
license: MIT
metadata:
  hermes:
    tags: [marketing, memes, cron, blueprint, humana-sisu, honduras]
    related_skills: []
    requires_toolsets: [file]
    blueprint:
      schedule: "0 9 * * *"
      deliver: local
      prompt: "Ejecuta el workflow de propuestas diarias de memes para la calculadora de deducciones. Sigue la Procedure de este skill."
      no_agent: false
    config:
      - key: memes.repo_root
        description: Ruta absoluta al root del repo saas-proyecto
        default: "/Users/jorgearturo/saas-proyecto"
        prompt: Ruta absoluta al repo saas-proyecto
---

# Memes calculadora deducciones — diario

Genera **5 propuestas nuevas** de anuncios tipo meme (imgflip + copy estilo LADbible) para promocionar la calculadora de deducciones de Honduras.

## When to Use

- Cron diario de marketing para Humano SISU
- Cuando el usuario pide propuestas de memes para `/calculadora-deducciones`
- Cuando un job lleva `--skill memes-calculadora-diario`

## Quick Reference

| Artefacto | Ruta (relativa a `memes.repo_root`) |
|-----------|-------------------------------------|
| Playbook completo | `docs/marketing/AGENT_INSTRUCCIONES_MEMES_DIARIOS.md` |
| Salida del día | `docs/marketing/meme-proposals/YYYY-MM-DD-memes-calculadora.md` |
| Historial | `docs/marketing/meme-proposals/*.md` |
| Producto | https://humanosisu.net/calculadora-deducciones |
| Templates | https://imgflip.com/memetemplates |

## Procedure

1. **Resolver repo root**  
   Usa `skills.config.memes.repo_root` (inyectado al cargar el skill). Si falta, usa el `workdir` del cron job o pregunta al usuario.

2. **Leer el playbook**  
   Con `read_file`, abre:
   ```
   {repo_root}/docs/marketing/AGENT_INSTRUCCIONES_MEMES_DIARIOS.md
   ```
   Ese archivo es la fuente de verdad: producto, estilo, formatos, reglas y checklist.

3. **Evitar repetición**  
   Lista `{repo_root}/docs/marketing/meme-proposals/`. Lee los **3 archivos más recientes** por fecha en el nombre. No reutilices templates imgflip ya usados en esas corridas.

4. **Opcional — templates trending**  
   Si tienes acceso web, revisa https://imgflip.com/memetemplates (top 30 days) y elige 5 templates distintos.

5. **Generar 5 propuestas**  
   Sigue el formato obligatorio del playbook (tabla de paneles, título, copy, CTA con UTM, "por qué funciona"). Reglas mínimas:
   - Al menos 2 ángulo "Recibo no cuadra"
   - Al menos 2 ángulo "RRHH no explica"
   - 5 templates imgflip distintos
   - Fecha en UTM y nombre de archivo: **hoy** en timezone `America/Tegucigalpa`

6. **Guardar entregable**  
   Escribe:
   ```
   {repo_root}/docs/marketing/meme-proposals/YYYY-MM-DD-memes-calculadora.md
   ```
   Incluye la tabla resumen al inicio (como en el playbook).

7. **Responder**  
   Confirma la ruta del archivo creado y pega la tabla resumen de las 5 propuestas.

## Pitfalls

- **No inventar** porcentajes legales: IHSS 5% con tope, RAP 1.5% sobre excedente, ISR progresivo.
- **No copiar literal** los ejemplos del playbook; solo la estructura.
- **No repetir** templates de las últimas 3 corridas.
- Si `write_file` falla, devuelve el markdown completo en la respuesta.
- Overlay principal del meme: máx. **8 palabras**.

## Verification

Antes de cerrar, verifica el checklist del playbook:

- [ ] 5 propuestas con templates distintos
- [ ] 2+ recibo no cuadra, 2+ RRHH no explica
- [ ] Archivo guardado con fecha correcta
- [ ] Tabla resumen al inicio del archivo
- [ ] Respuesta incluye ruta del archivo
