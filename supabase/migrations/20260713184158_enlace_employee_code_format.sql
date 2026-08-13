-- Enlace only: employee_code = primera(s) letra(s) del nombre + últimos 5 del DNI
-- Ej: Jorge + 0510199100731 → J00731; si hay choque → JO00731
-- Scope: company_id = c419b1a5-32de-4518-8ff2-e7ebd6318a9f

DO $$
DECLARE
  enlace_id uuid := 'c419b1a5-32de-4518-8ff2-e7ebd6318a9f';
  rec RECORD;
  letters text;
  last5 text;
  candidate text;
  taken boolean;
  letter_len int;
  suffix int;
BEGIN
  -- Fase 1: liberar códigos actuales (evita choques con UNIQUE(company_id, employee_code))
  UPDATE employees
  SET employee_code = '__ENLACE_TMP__' || id::text
  WHERE company_id = enlace_id;

  -- Fase 2: asignar formato nuevo, resolviendo duplicados con más letras
  FOR rec IN
    SELECT id, name, dni
    FROM employees
    WHERE company_id = enlace_id
    ORDER BY name ASC, id ASC
  LOOP
    letters := upper(
      regexp_replace(
        translate(
          split_part(trim(coalesce(rec.name, '')), ' ', 1),
          'ÁÉÍÓÚÜÑáéíóúüñ',
          'AEIOUUNaeiouun'
        ),
        '[^A-Za-z]',
        '',
        'g'
      )
    );
    last5 := right(regexp_replace(coalesce(rec.dni, ''), '[^0-9]', '', 'g'), 5);

    IF letters IS NULL OR letters = '' OR last5 IS NULL OR length(last5) < 5 THEN
      RAISE EXCEPTION
        'Enlace employee_code: no se puede generar para id=% name=% dni=%',
        rec.id, rec.name, rec.dni;
    END IF;

    candidate := NULL;
    FOR letter_len IN 1..length(letters) LOOP
      candidate := left(letters, letter_len) || last5;
      SELECT EXISTS (
        SELECT 1
        FROM employees e
        WHERE e.company_id = enlace_id
          AND e.employee_code = candidate
          AND e.id <> rec.id
      ) INTO taken;

      IF NOT taken THEN
        EXIT;
      END IF;
      candidate := NULL;
    END LOOP;

    IF candidate IS NULL THEN
      candidate := letters || last5;
      suffix := 2;
      LOOP
        SELECT EXISTS (
          SELECT 1
          FROM employees e
          WHERE e.company_id = enlace_id
            AND e.employee_code = candidate || suffix::text
            AND e.id <> rec.id
        ) INTO taken;
        EXIT WHEN NOT taken;
        suffix := suffix + 1;
      END LOOP;
      candidate := candidate || suffix::text;
    END IF;

    UPDATE employees
    SET employee_code = candidate,
        updated_at = now()
    WHERE id = rec.id
      AND company_id = enlace_id;
  END LOOP;
END $$;
