-- Migration: Add medical_deduction_limit to tax_brackets
-- Date: 2026-03-03
-- Description: L 40,000 annual medical expenses deduction for ISR 5th category (Honduras)

ALTER TABLE tax_brackets
  ADD COLUMN IF NOT EXISTS medical_deduction_limit NUMERIC(10,2) DEFAULT 40000;

COMMENT ON COLUMN tax_brackets.medical_deduction_limit IS 'Annual medical expenses deduction limit per employee (HNL). Honduras default L 40,000.';
