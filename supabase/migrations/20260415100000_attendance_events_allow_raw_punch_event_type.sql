-- Webhook Hikvision y generateDailyCloseReport usan event_type = 'raw_punch'.
-- El check histórico solo permitía check_in / check_out y rechazaba todo insert biométrico.

ALTER TABLE public.attendance_events
  DROP CONSTRAINT IF EXISTS attendance_events_event_type_check;

ALTER TABLE public.attendance_events
  ADD CONSTRAINT attendance_events_event_type_check
  CHECK (
    event_type = ANY (
      ARRAY[
        'check_in'::text,
        'check_out'::text,
        'raw_punch'::text
      ]
    )
  );

COMMENT ON CONSTRAINT attendance_events_event_type_check ON public.attendance_events IS
  'Incluye raw_punch para ingesta inmutable del reloj; check_in/check_out para otros flujos.';
