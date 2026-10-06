# Bitácora de cambios SEO

> Una fila por cambio que pueda mover métricas. El agente agrega filas al abrir un PR
> y completa "Resultado" cuando llega la fecha de medición (mínimo 28 días después del deploy).

| Fecha deploy | Página / alcance | Cambio | Hipótesis | Métrica | Medir el | Resultado |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-10-05 | `/deducciones-honduras-ihss-rap-isr`, guía ISR/RAP | Reescritura answer-first + titles alineados a consultas GSC (commits `6f6d435c`, `3b2e6c0d`) | Subir CTR desde 0.92% / 1.43% | CTR de la página | 2026-11-02 | pendiente |
| pendiente merge | `/recursos/cumplimiento-legal-errores-13vo-14vo-salario` | Title corto con "13vo y 14vo salario Honduras" al inicio + description answer-first (informe 2026-10-03) | Subir CTR desde 0% (67 impr., pos. 5.9) | CTR de la página | 2026-11-10 | pendiente |
| pendiente merge | `sitemap.xml` (páginas estáticas) | Quitar `lastmod` = hoy en cada petición (PR fase 0) | Google vuelve a confiar en `lastmod` de recursos y landings | Frecuencia de rastreo de recursos (GSC → Estadísticas de rastreo, manual) | 35 días tras deploy | pendiente |
| pendiente merge | Calculadoras de deducciones HN / SV / GT | Enlaces cruzados entre las tres; el pilar de Honduras queda solo en la de HN (PR fase 0) | Más impresiones de SV/GT por enlazado interno y menos señal "Honduras" en SV/GT | Impresiones de `/calculadora-deducciones-el-salvador` y `-guatemala` | 35 días tras deploy | pendiente |
