-- Adds indices for attendance queries
create index if not exists idx_att_ev_employee_ts on attendance_events(employee_id, ts_local);
create index if not exists idx_att_ev_type_ts on attendance_events(event_type, ts_local);
create index if not exists idx_emp_team on employees(team);
