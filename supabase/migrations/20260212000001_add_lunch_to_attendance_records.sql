-- Migration: Add lunch_start and lunch_end to attendance_records (4-marks flow)
-- Date: 2026-02-12
-- Description: For clients that register 4 biometric marks per day: entrada, inicio almuerzo, fin almuerzo, salida.
-- Lunch time is variable (not fixed), so order of events defines the slot. Used only for companies that need it.

ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS lunch_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS lunch_end TIMESTAMPTZ;

COMMENT ON COLUMN attendance_records.lunch_start IS 'Hora inicio almuerzo (2ª marca del día). Solo usado en flujo 4 marcas por empresa.';
COMMENT ON COLUMN attendance_records.lunch_end IS 'Hora fin almuerzo (3ª marca del día). Solo usado en flujo 4 marcas por empresa.';
