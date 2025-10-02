-- Create employee_invitations table
CREATE TABLE IF NOT EXISTS employee_invitations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    invited_by UUID REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_invitations_email ON employee_invitations(email);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_token ON employee_invitations(token);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_status ON employee_invitations(status);
CREATE INDEX IF NOT EXISTS idx_employee_invitations_expires_at ON employee_invitations(expires_at);

-- Enable RLS
ALTER TABLE employee_invitations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for employee_invitations
CREATE POLICY "Admins can view all invitations" ON employee_invitations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Admins can create invitations" ON employee_invitations
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Admins can update invitations" ON employee_invitations
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = auth.uid() 
            AND user_profiles.role IN ('super_admin', 'admin')
        )
    );

CREATE POLICY "Anyone can view invitation by token" ON employee_invitations
    FOR SELECT USING (true); -- Allow public access for invitation acceptance

-- Function to automatically expire invitations
CREATE OR REPLACE FUNCTION expire_old_invitations()
RETURNS void AS $$
BEGIN
    UPDATE employee_invitations 
    SET status = 'expired', updated_at = NOW()
    WHERE status = 'pending' 
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_employee_invitations_updated_at
    BEFORE UPDATE ON employee_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON employee_invitations TO authenticated;
GRANT ALL ON employee_invitations TO anon;
