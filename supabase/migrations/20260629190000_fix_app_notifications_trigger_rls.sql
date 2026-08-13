-- Fix: leave/attendance notification triggers must bypass RLS on app_notifications.
-- Triggers run as the invoking user (authenticated); app_notifications has SELECT-only policies.

CREATE OR REPLACE FUNCTION public.tg_notify_attendance_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_company_id uuid;
  emp_name text;
  msg_employee text;
  msg_company text;
BEGIN
  SELECT e.company_id, e.name
    INTO emp_company_id, emp_name
  FROM public.employees e
  WHERE e.id = new.employee_id;

  IF emp_company_id IS NULL THEN
    RETURN new;
  END IF;

  msg_employee := 'Se registró una marca de asistencia.';
  msg_company := coalesce(emp_name, 'Empleado') || ' registró asistencia.';

  INSERT INTO public.app_notifications (company_id, employee_id, module, type, title, message, metadata)
  VALUES (
    emp_company_id,
    new.employee_id,
    'attendance',
    'info',
    'Asistencia registrada',
    msg_employee,
    jsonb_build_object(
      'event_type', new.event_type,
      'ts_utc', new.ts_utc,
      'ts_local', new.ts_local,
      'device_id', new.device_id,
      'source', new.source,
      'ref_record_id', new.ref_record_id
    )
  );

  INSERT INTO public.app_notifications (company_id, employee_id, module, type, title, message, metadata)
  VALUES (
    emp_company_id,
    NULL,
    'attendance',
    'info',
    'Registro de asistencia',
    msg_company,
    jsonb_build_object(
      'employee_id', new.employee_id,
      'employee_name', emp_name,
      'event_type', new.event_type,
      'ts_utc', new.ts_utc,
      'ts_local', new.ts_local
    )
  );

  RETURN new;
END;
$$;

CREATE OR REPLACE FUNCTION public.tg_notify_leave_request_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  emp_company_id uuid;
  emp_name text;
  leave_type_name text;
  msg_employee text;
  msg_company text;
BEGIN
  SELECT e.company_id, e.name
    INTO emp_company_id, emp_name
  FROM public.employees e
  WHERE e.id = new.employee_id;

  SELECT lt.name
    INTO leave_type_name
  FROM public.leave_types lt
  WHERE lt.id = new.leave_type_id;

  IF emp_company_id IS NULL THEN
    RETURN new;
  END IF;

  msg_employee := 'Tu solicitud de permiso fue enviada para aprobación.';
  msg_company :=
    coalesce(emp_name, 'Empleado') ||
    ' solicitó permiso' ||
    CASE WHEN leave_type_name IS NOT NULL THEN ' (' || leave_type_name || ')' ELSE '' END ||
    '.';

  INSERT INTO public.app_notifications (company_id, employee_id, module, type, title, message, metadata)
  VALUES (
    emp_company_id,
    new.employee_id,
    'leave',
    'info',
    'Permiso solicitado',
    msg_employee,
    jsonb_build_object(
      'leave_request_id', new.id,
      'leave_type_id', new.leave_type_id,
      'leave_type_name', leave_type_name,
      'start_date', new.start_date,
      'end_date', new.end_date,
      'days_requested', new.days_requested,
      'status', new.status
    )
  );

  INSERT INTO public.app_notifications (company_id, employee_id, module, type, title, message, metadata)
  VALUES (
    emp_company_id,
    NULL,
    'leave',
    'warning',
    'Nueva solicitud de permiso',
    msg_company,
    jsonb_build_object(
      'leave_request_id', new.id,
      'employee_id', new.employee_id,
      'employee_name', emp_name,
      'leave_type_id', new.leave_type_id,
      'leave_type_name', leave_type_name,
      'start_date', new.start_date,
      'end_date', new.end_date,
      'days_requested', new.days_requested,
      'reason', new.reason
    )
  );

  RETURN new;
END;
$$;

COMMENT ON FUNCTION public.tg_notify_leave_request_created() IS
  'AFTER INSERT on leave_requests: in-app notifications for employee and managers. SECURITY DEFINER bypasses RLS on app_notifications.';

COMMENT ON FUNCTION public.tg_notify_attendance_event() IS
  'AFTER INSERT on attendance_events: in-app notifications. SECURITY DEFINER bypasses RLS on app_notifications.';
