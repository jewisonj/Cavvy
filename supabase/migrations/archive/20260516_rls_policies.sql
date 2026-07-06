-- ============================================================
-- Row Level Security Policies
-- Implements access control: Owner/Staff = full CRUD, Vet = read + insert observations
-- ============================================================

-- ============================================================
-- Helper Function: Check if user has role
-- ============================================================
CREATE OR REPLACE FUNCTION auth.user_has_role(required_role user_role)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION auth.user_has_any_role(required_roles user_role[])
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = ANY(required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- User Profiles Policies
-- ============================================================
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Owners can read all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Owners can delete profiles" ON user_profiles;

-- Users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Owners can read all profiles
CREATE POLICY "Owners can read all profiles" ON user_profiles
    FOR SELECT USING (auth.user_has_role('owner'));

-- Owners can insert new profiles (for adding staff/vet)
CREATE POLICY "Owners can insert profiles" ON user_profiles
    FOR INSERT WITH CHECK (auth.user_has_role('owner'));

-- Owners can update any profile
CREATE POLICY "Owners can update all profiles" ON user_profiles
    FOR UPDATE USING (auth.user_has_role('owner'));

-- Owners can delete profiles
CREATE POLICY "Owners can delete profiles" ON user_profiles
    FOR DELETE USING (auth.user_has_role('owner'));

-- ============================================================
-- Horses Policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated users can read horses" ON horses;
DROP POLICY IF EXISTS "Owner and staff can insert horses" ON horses;
DROP POLICY IF EXISTS "Owner and staff can update horses" ON horses;
DROP POLICY IF EXISTS "Owner and staff can delete horses" ON horses;

-- All authenticated users can read horses (owner, staff, vet)
CREATE POLICY "Authenticated users can read horses" ON horses
    FOR SELECT USING (auth.role() = 'authenticated');

-- Owner and staff can insert horses
CREATE POLICY "Owner and staff can insert horses" ON horses
    FOR INSERT WITH CHECK (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- Owner and staff can update horses
CREATE POLICY "Owner and staff can update horses" ON horses
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- Only owners can delete horses
CREATE POLICY "Owners can delete horses" ON horses
    FOR DELETE USING (auth.user_has_role('owner'));

-- ============================================================
-- Heat Observations Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read heat observations" ON heat_observations;
DROP POLICY IF EXISTS "All users can insert heat observations" ON heat_observations;
DROP POLICY IF EXISTS "Owner and staff can update heat observations" ON heat_observations;
DROP POLICY IF EXISTS "Owner and staff can delete heat observations" ON heat_observations;

-- All authenticated users can read
CREATE POLICY "All users can read heat observations" ON heat_observations
    FOR SELECT USING (auth.role() = 'authenticated');

-- All authenticated users can insert (vet needs this for exams)
CREATE POLICY "All users can insert heat observations" ON heat_observations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Owner and staff can update
CREATE POLICY "Owner and staff can update heat observations" ON heat_observations
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- Owner and staff can delete
CREATE POLICY "Owner and staff can delete heat observations" ON heat_observations
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Breeding Events Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read breeding events" ON breeding_events;
DROP POLICY IF EXISTS "Owner and staff can insert breeding events" ON breeding_events;
DROP POLICY IF EXISTS "Owner and staff can update breeding events" ON breeding_events;
DROP POLICY IF EXISTS "Owner and staff can delete breeding events" ON breeding_events;

CREATE POLICY "All users can read breeding events" ON breeding_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can insert breeding events" ON breeding_events
    FOR INSERT WITH CHECK (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can update breeding events" ON breeding_events
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete breeding events" ON breeding_events
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Ultrasound Checks Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read ultrasound checks" ON ultrasound_checks;
DROP POLICY IF EXISTS "All users can insert ultrasound checks" ON ultrasound_checks;
DROP POLICY IF EXISTS "Owner and staff can update ultrasound checks" ON ultrasound_checks;
DROP POLICY IF EXISTS "Owner and staff can delete ultrasound checks" ON ultrasound_checks;

CREATE POLICY "All users can read ultrasound checks" ON ultrasound_checks
    FOR SELECT USING (auth.role() = 'authenticated');

-- All users can insert (vet performs pregnancy checks)
CREATE POLICY "All users can insert ultrasound checks" ON ultrasound_checks
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can update ultrasound checks" ON ultrasound_checks
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete ultrasound checks" ON ultrasound_checks
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Semen Shipments Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read semen shipments" ON semen_shipments;
DROP POLICY IF EXISTS "Owner and staff can insert semen shipments" ON semen_shipments;
DROP POLICY IF EXISTS "Owner and staff can update semen shipments" ON semen_shipments;
DROP POLICY IF EXISTS "Owner and staff can delete semen shipments" ON semen_shipments;

CREATE POLICY "All users can read semen shipments" ON semen_shipments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can insert semen shipments" ON semen_shipments
    FOR INSERT WITH CHECK (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can update semen shipments" ON semen_shipments
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete semen shipments" ON semen_shipments
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Foaling Events Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read foaling events" ON foaling_events;
DROP POLICY IF EXISTS "All users can insert foaling events" ON foaling_events;
DROP POLICY IF EXISTS "Owner and staff can update foaling events" ON foaling_events;
DROP POLICY IF EXISTS "Owner and staff can delete foaling events" ON foaling_events;

CREATE POLICY "All users can read foaling events" ON foaling_events
    FOR SELECT USING (auth.role() = 'authenticated');

-- All users can insert (vet may be present at foaling)
CREATE POLICY "All users can insert foaling events" ON foaling_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can update foaling events" ON foaling_events
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete foaling events" ON foaling_events
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Foaling Prep Observations Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read foaling prep observations" ON foaling_prep_observations;
DROP POLICY IF EXISTS "All users can insert foaling prep observations" ON foaling_prep_observations;
DROP POLICY IF EXISTS "Owner and staff can update foaling prep observations" ON foaling_prep_observations;
DROP POLICY IF EXISTS "Owner and staff can delete foaling prep observations" ON foaling_prep_observations;

CREATE POLICY "All users can read foaling prep observations" ON foaling_prep_observations
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert foaling prep observations" ON foaling_prep_observations
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can update foaling prep observations" ON foaling_prep_observations
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete foaling prep observations" ON foaling_prep_observations
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Attachments Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read attachments" ON attachments;
DROP POLICY IF EXISTS "All users can insert attachments" ON attachments;
DROP POLICY IF EXISTS "Owner and staff can update attachments" ON attachments;
DROP POLICY IF EXISTS "Owner and staff can delete attachments" ON attachments;

CREATE POLICY "All users can read attachments" ON attachments
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert attachments" ON attachments
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can update attachments" ON attachments
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete attachments" ON attachments
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Documents Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read documents" ON documents;
DROP POLICY IF EXISTS "Owner and staff can insert documents" ON documents;
DROP POLICY IF EXISTS "Owner and staff can update documents" ON documents;
DROP POLICY IF EXISTS "Owner and staff can delete documents" ON documents;

CREATE POLICY "All users can read documents" ON documents
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can insert documents" ON documents
    FOR INSERT WITH CHECK (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can update documents" ON documents
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete documents" ON documents
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Costs Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read costs" ON costs;
DROP POLICY IF EXISTS "Owner and staff can insert costs" ON costs;
DROP POLICY IF EXISTS "Owner and staff can update costs" ON costs;
DROP POLICY IF EXISTS "Owner and staff can delete costs" ON costs;

CREATE POLICY "All users can read costs" ON costs
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can insert costs" ON costs
    FOR INSERT WITH CHECK (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can update costs" ON costs
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete costs" ON costs
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Breeding Contracts Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read breeding contracts" ON breeding_contracts;
DROP POLICY IF EXISTS "Owner and staff can insert breeding contracts" ON breeding_contracts;
DROP POLICY IF EXISTS "Owner and staff can update breeding contracts" ON breeding_contracts;
DROP POLICY IF EXISTS "Owner and staff can delete breeding contracts" ON breeding_contracts;

CREATE POLICY "All users can read breeding contracts" ON breeding_contracts
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can insert breeding contracts" ON breeding_contracts
    FOR INSERT WITH CHECK (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can update breeding contracts" ON breeding_contracts
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete breeding contracts" ON breeding_contracts
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Stallion Details Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read stallion details" ON stallion_details;
DROP POLICY IF EXISTS "Owner and staff can insert stallion details" ON stallion_details;
DROP POLICY IF EXISTS "Owner and staff can update stallion details" ON stallion_details;
DROP POLICY IF EXISTS "Owner and staff can delete stallion details" ON stallion_details;

CREATE POLICY "All users can read stallion details" ON stallion_details
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can insert stallion details" ON stallion_details
    FOR INSERT WITH CHECK (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can update stallion details" ON stallion_details
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete stallion details" ON stallion_details
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Health Events Policies
-- ============================================================
DROP POLICY IF EXISTS "All users can read health events" ON health_events;
DROP POLICY IF EXISTS "All users can insert health events" ON health_events;
DROP POLICY IF EXISTS "Owner and staff can update health events" ON health_events;
DROP POLICY IF EXISTS "Owner and staff can delete health events" ON health_events;

CREATE POLICY "All users can read health events" ON health_events
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "All users can insert health events" ON health_events
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can update health events" ON health_events
    FOR UPDATE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

CREATE POLICY "Owner and staff can delete health events" ON health_events
    FOR DELETE USING (
        auth.user_has_any_role(ARRAY['owner', 'staff']::user_role[])
    );

-- ============================================================
-- Alerts Policies
-- ============================================================
DROP POLICY IF EXISTS "Users can read own alerts" ON alerts;
DROP POLICY IF EXISTS "System can insert alerts" ON alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON alerts;
DROP POLICY IF EXISTS "Owners can delete any alert" ON alerts;

-- Users can only see their own alerts
CREATE POLICY "Users can read own alerts" ON alerts
    FOR SELECT USING (auth.uid() = user_id);

-- System/authenticated users can insert alerts (for automated alerts)
CREATE POLICY "System can insert alerts" ON alerts
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Users can update their own alerts (for dismissing)
CREATE POLICY "Users can update own alerts" ON alerts
    FOR UPDATE USING (auth.uid() = user_id);

-- Owners can delete any alert
CREATE POLICY "Owners can delete any alert" ON alerts
    FOR DELETE USING (auth.user_has_role('owner'));

-- ============================================================
-- Dictation Log Policies
-- ============================================================
DROP POLICY IF EXISTS "Users can read own dictation log" ON dictation_log;
DROP POLICY IF EXISTS "Users can insert own dictation log" ON dictation_log;
DROP POLICY IF EXISTS "Owners can read all dictation logs" ON dictation_log;

-- Users can read their own logs
CREATE POLICY "Users can read own dictation log" ON dictation_log
    FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own logs
CREATE POLICY "Users can insert own dictation log" ON dictation_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Owners can read all logs (for audit purposes)
CREATE POLICY "Owners can read all dictation logs" ON dictation_log
    FOR SELECT USING (auth.user_has_role('owner'));

-- ============================================================
-- Grant usage on helper functions
-- ============================================================
GRANT EXECUTE ON FUNCTION auth.user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_has_any_role TO authenticated;

-- ============================================================
-- Comments for documentation
-- ============================================================
COMMENT ON FUNCTION auth.user_has_role IS 'Check if current user has a specific role';
COMMENT ON FUNCTION auth.user_has_any_role IS 'Check if current user has any of the specified roles';
