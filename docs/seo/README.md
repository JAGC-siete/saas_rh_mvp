# Agente SEO de humanosisu.net

Ciclo semanal:

1. **Lunes 05:00 (Tegucigalpa)** — GitHub Actions (`.github/workflows/seo-data-weekly.yml`) corre
   `scripts/seo/gsc-export.mjs` y guarda los datos en la rama `seo-data` (`seo-data/<fecha>/`).
2. **Lunes 08:00** — la tarea programada de Claude "Agente SEO semanal" usa la skill `seo-strategist`:
   lee los datos, los compara con `docs/seo/estrategia.md` y `docs/seo/bitacora.md`, decide ajustes
   y abre **un PR** (nunca hace merge ni deploy) con el informe y los cambios propuestos.
3. Tú revisas y haces merge. El deploy sigue el CI/CD normal.

## Configuración (una sola vez)

1. Google Cloud → crear proyecto → habilitar **Google Search Console API**.
2. Crear una **cuenta de servicio** → generar clave JSON.
3. Search Console → `sc-domain:humanosisu.net` → Configuración → Usuarios y permisos →
   agregar el `client_email` de la cuenta de servicio como **Propietario** (necesario para URL Inspection;
   "Completo" basta si solo se quieren métricas).
4. GitHub → repo → Settings → Secrets and variables → Actions → nuevo secreto
   `GSC_SERVICE_ACCOUNT_JSON` con el contenido completo del JSON.
5. Actions → "SEO · datos semanales de Search Console" → **Run workflow** para la primera carga.

Prueba local sin credenciales: `node scripts/seo/gsc-export.mjs --dry-run` (escribe datos falsos en `seo-data/`).

## Límites del agente

- No hace merge, no despliega, no toca `/app`, pagos, auth ni lógica de planilla.
- No publica calculadoras de SV/GT sin validación legal humana.
- No inventa reseñas, ratings ni datos de competidores.
- Máximo un experimento activo por página; mide a 28 días.
