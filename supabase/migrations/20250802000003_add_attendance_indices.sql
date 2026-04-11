-- Adds indices for attendance queries
-- team: usado por APIs de empleados y PDF de nómina (agrupar por equipo); debe existir antes del índice
alter table public.employees add column if not exists team text;
create index if not exists idx_att_ev_employee_ts on attendance_events(employee_id, ts_local);
create index if not exists idx_att_ev_type_ts on attendance_events(event_type, ts_local);
create index if not exists idx_emp_team on employees(team);
