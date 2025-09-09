-- Migration: Company Subscriptions for Plan V1
-- Date: 2025-01-27
-- Description: Add company subscriptions and metering tables for billing enforcement

-- Company subscriptions table
CREATE TABLE IF NOT EXISTS company_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'trial', -- trial | active | past_due | canceled
  plan TEXT NOT NULL DEFAULT 'basic',
  trial_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  trial_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id)
);

-- Company meters table for usage tracking
CREATE TABLE IF NOT EXISTS company_meters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  month DATE NOT NULL, -- 2025-09-01
  pdfs_generated INT NOT NULL DEFAULT 0,
  vouchers_sent INT NOT NULL DEFAULT 0,
  attendances_recorded INT NOT NULL DEFAULT 0,
  employees_created INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, month)
);

-- Organization members table
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'employee',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, user_id)
);

-- Organization invites table
CREATE TABLE IF NOT EXISTS organization_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'employee',
  token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(company_id, email)
);

-- Manual payments table
CREATE TABLE IF NOT EXISTS manual_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  amount_hnl NUMERIC NOT NULL,
  reference TEXT, -- número de transferencia, notas
  paid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_company ON company_subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_company_subscriptions_status ON company_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_company_meters_company_month ON company_meters(company_id, month);
CREATE INDEX IF NOT EXISTS idx_organization_members_company ON organization_members(company_id);
CREATE INDEX IF NOT EXISTS idx_organization_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_company ON organization_invites(company_id);
CREATE INDEX IF NOT EXISTS idx_organization_invites_token ON organization_invites(token);
CREATE INDEX IF NOT EXISTS idx_manual_payments_company ON manual_payments(company_id);

-- Function to increment meters safely
CREATE OR REPLACE FUNCTION inc_meter(p_company_id UUID, p_month DATE, p_field TEXT)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO company_meters(company_id, month) 
  VALUES (p_company_id, p_month)
  ON CONFLICT (company_id, month) DO NOTHING;

  EXECUTE format(
    'UPDATE company_meters SET %I = %I + 1, updated_at = now() WHERE company_id = $1 AND month = $2', 
    p_field, p_field
  ) USING p_company_id, p_month;
END; $$;

-- Enable RLS on new tables
ALTER TABLE company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_meters ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_subscriptions
CREATE POLICY "Users can view their company subscription" ON company_subscriptions
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins can manage subscriptions" ON company_subscriptions
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'super_admin')
        )
    );

-- RLS Policies for company_meters
CREATE POLICY "Users can view their company meters" ON company_meters
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "System can update meters" ON company_meters
    FOR ALL USING (true);

-- RLS Policies for organization_members
CREATE POLICY "Users can view members in their company" ON organization_members
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins can manage members" ON organization_members
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'super_admin')
        )
    );

-- RLS Policies for organization_invites
CREATE POLICY "Users can view invites in their company" ON organization_invites
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins can manage invites" ON organization_invites
    FOR ALL USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'super_admin')
        )
    );

-- RLS Policies for manual_payments
CREATE POLICY "Users can view payments in their company" ON manual_payments
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid()
        )
    );

CREATE POLICY "Company admins can create payments" ON manual_payments
    FOR INSERT WITH CHECK (
        company_id IN (
            SELECT company_id FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND role IN ('company_admin', 'super_admin')
        )
    );

-- Add comments
COMMENT ON TABLE company_subscriptions IS 'Company subscription status and plan information';
COMMENT ON TABLE company_meters IS 'Monthly usage meters for billing enforcement';
COMMENT ON TABLE organization_members IS 'Organization membership with roles';
COMMENT ON TABLE organization_invites IS 'Pending organization invitations';
COMMENT ON TABLE manual_payments IS 'Manual payment records for billing';
COMMENT ON FUNCTION inc_meter IS 'Safely increment usage meters for a company';
