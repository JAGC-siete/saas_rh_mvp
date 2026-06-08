-- Add voucher (recibo de pago) to report configuration types

ALTER TYPE report_type_enum ADD VALUE IF NOT EXISTS 'voucher';
