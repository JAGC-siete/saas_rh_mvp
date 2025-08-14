# Attendance Dashboard

Esta sección describe los presets de fecha y ejemplos de consultas utilizados por el módulo de asistencia.

## Presets de Fecha

- **Hoy**: rango del día actual.
- **Semana**: desde el lunes hasta el domingo de la semana actual.
- **Quincena**: 1-15 o 16-fin de mes según la fecha actual.
- **Mes**: todo el mes en curso.
- **Año**: desde el 1 de enero al 31 de diciembre.
- **Custom**: rango definido manualmente.

## Ejemplos de Consultas

Presentes vs ausentes en un rango:

```sql
with base as (
  select e.id as employee_id,
         exists(
           select 1 from attendance_events ev
           where ev.employee_id = e.id
             and ev.event_type = 'check_in'
             and ev.ts_local >= $1 and ev.ts_local < $2
         ) as has_checkin
  from employees e
)
select
  count(*) filter (where has_checkin) as presentes,
  count(*) filter (where not has_checkin) as ausentes
from base;
```

Llegadas temprano o tarde hoy:

```sql
select e.id, e.name, e.team,
       date_trunc('minute', ev.ts_local) as check_in_time,
       extract(epoch from (ev.ts_local::time - e.shift_start)) / 60 as delta_min
from employees e
join lateral (
  select ev.* from attendance_events ev
  where ev.employee_id = e.id
    and ev.event_type = 'check_in'
    and ev.ts_local::date = (now() at time zone 'America/Tegucigalpa')::date
  order by ev.ts_local asc
  limit 1
) ev on true;
```
