-- Cavvy schema — consolidated migration for the SHARED Supabase project
-- (same project as mwes-invoice and spa-scheduler).
--
-- Everything lives in a dedicated `cavvy` schema so nothing collides with the
-- other apps' tables in `public`. Auth (auth.users) is shared project-wide;
-- Cavvy access is gated by having a row in cavvy.user_profiles.
--
-- After running this, one manual dashboard step is required:
--   Project Settings -> API -> Exposed schemas -> add `cavvy`
-- The JS clients select the schema via createClient(..., { db: { schema: 'cavvy' } }).
--
-- Supersedes the archived standalone-project migrations (never deployed).

CREATE SCHEMA IF NOT EXISTS cavvy;

GRANT USAGE ON SCHEMA cavvy TO anon, authenticated, service_role;

-- ============================================================
-- Enums
-- ============================================================
CREATE TYPE cavvy.sex_enum AS ENUM ('mare', 'stallion', 'gelding', 'filly', 'colt');
CREATE TYPE cavvy.heat_observation_method AS ENUM ('visual', 'ultrasound', 'palpation', 'behavior_only');
CREATE TYPE cavvy.uterine_tone_enum AS ENUM ('flaccid', 'soft', 'toned');
CREATE TYPE cavvy.heat_observation_purpose AS ENUM ('routine_check', 'pre_breeding', 'post_breeding', 'other');
CREATE TYPE cavvy.breeding_method AS ENUM ('live_cover', 'ai_fresh', 'ai_cooled', 'ai_frozen', 'embryo_transfer');
CREATE TYPE cavvy.ultrasound_result AS ENUM ('open', 'in_foal', 'twins', 'lost', 'unclear');
CREATE TYPE cavvy.semen_type_enum AS ENUM ('fresh', 'cooled', 'frozen');
CREATE TYPE cavvy.ship_method_enum AS ENUM ('ups', 'fedex', 'courier_counter_to_counter', 'other');
CREATE TYPE cavvy.foaling_outcome AS ENUM ('live', 'stillborn', 'aborted', 'dystocia_live', 'dystocia_loss');
CREATE TYPE cavvy.udder_development_enum AS ENUM ('none', 'filling', 'full', 'very_full', 'dripping');
CREATE TYPE cavvy.user_role AS ENUM ('owner', 'staff', 'vet');
CREATE TYPE cavvy.entity_type_enum AS ENUM ('horse', 'breeding_event', 'heat_observation', 'ultrasound_check', 'foaling_event', 'foaling_prep', 'semen_shipment', 'hormone_treatment', 'other');
CREATE TYPE cavvy.file_type_enum AS ENUM ('image', 'video', 'pdf', 'other');
CREATE TYPE cavvy.doc_type_enum AS ENUM ('contract', 'coggins', 'registration', 'health_cert', 'vet_record', 'other');
CREATE TYPE cavvy.cost_type_enum AS ENUM ('stud_fee', 'shipping', 'semen', 'vet_ultrasound', 'vet_other', 'mare_care', 'registration', 'other');
CREATE TYPE cavvy.shipping_responsibility_enum AS ENUM ('mare_owner', 'stallion_owner', 'split');
CREATE TYPE cavvy.parse_status_enum AS ENUM ('unparsed', 'parsed_unconfirmed', 'confirmed', 'manual_entry');
CREATE TYPE cavvy.seven_panel_status_enum AS ENUM ('clear', 'n_n', 'carrier', 'unknown');
CREATE TYPE cavvy.hormone_treatment_type AS ENUM ('estrumate', 'lutalyse', 'regumate', 'deslorelin', 'hcg', 'oxytocin', 'other');

-- ============================================================
-- User Profiles — Cavvy roles for shared-project users.
-- A shared-project auth user with no row here has NO Cavvy access.
-- ============================================================
CREATE TABLE cavvy.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role cavvy.user_role NOT NULL DEFAULT 'staff',
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Horses — central table for all animals
-- ============================================================
CREATE TABLE cavvy.horses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    registered_name TEXT,
    barn_name TEXT,
    aqha_number TEXT,
    sex cavvy.sex_enum NOT NULL,
    dob DATE,
    aqha_age_year INTEGER,
    color TEXT,
    markings TEXT,
    sire_id UUID REFERENCES cavvy.horses(id) ON DELETE SET NULL,
    dam_id UUID REFERENCES cavvy.horses(id) ON DELETE SET NULL,
    owned BOOLEAN NOT NULL DEFAULT true,
    acquired_date DATE,
    disposition_date DATE,
    disposition_notes TEXT,
    profile_photo_url TEXT,
    drive_folder_url TEXT,
    photos_album_url TEXT,
    broodmare_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Heat Observations — reproductive cycle tracking
-- ============================================================
CREATE TABLE cavvy.heat_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mare_id UUID NOT NULL REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    method cavvy.heat_observation_method NOT NULL,
    in_heat BOOLEAN NOT NULL,
    standing BOOLEAN,
    stud_interest TEXT,
    left_ovary_follicle_mm INTEGER,
    right_ovary_follicle_mm INTEGER,
    left_ovary_notes TEXT,
    right_ovary_notes TEXT,
    uterine_edema_score INTEGER CHECK (uterine_edema_score BETWEEN 0 AND 4),
    uterine_tone cavvy.uterine_tone_enum,
    cervix_notes TEXT,
    ovulation_confirmed BOOLEAN,
    performed_by TEXT NOT NULL,
    vet_present BOOLEAN NOT NULL DEFAULT false,
    purpose cavvy.heat_observation_purpose NOT NULL DEFAULT 'routine_check',
    notes TEXT,
    is_historical BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Breeding Events
-- ============================================================
CREATE TABLE cavvy.breeding_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mare_id UUID NOT NULL REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    stallion_id UUID REFERENCES cavvy.horses(id) ON DELETE SET NULL,
    stallion_name_freetext TEXT,
    method cavvy.breeding_method NOT NULL,
    breeding_date DATE NOT NULL,
    pulled_date DATE,
    stallion_station TEXT,
    contract_doc_url TEXT,
    notes TEXT,
    season_year INTEGER NOT NULL,
    is_historical BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Ultrasound Checks — pregnancy confirmation (14/30/45/60d)
-- ============================================================
CREATE TABLE cavvy.ultrasound_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breeding_event_id UUID NOT NULL REFERENCES cavvy.breeding_events(id) ON DELETE CASCADE,
    mare_id UUID NOT NULL REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    days_post_breeding INTEGER NOT NULL,
    result cavvy.ultrasound_result NOT NULL,
    performed_by TEXT NOT NULL,
    vet_present BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    image_urls TEXT[],
    is_historical BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Hormone Treatments — estrumate/lutalyse short-cycling, regumate, etc.
-- Stored because they anchor planning dates (heat expected +3-5d,
-- breed-ready +6-8d after estrumate); projections are computed in app code.
-- ============================================================
CREATE TABLE cavvy.hormone_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mare_id UUID NOT NULL REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    treatment_date DATE NOT NULL,
    treatment_type cavvy.hormone_treatment_type NOT NULL,
    dose TEXT,
    administered_by TEXT NOT NULL,
    vet_present BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    is_historical BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Semen Shipments
-- ============================================================
CREATE TABLE cavvy.semen_shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breeding_event_id UUID REFERENCES cavvy.breeding_events(id) ON DELETE SET NULL,
    mare_id UUID NOT NULL REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    stallion_id UUID REFERENCES cavvy.horses(id) ON DELETE SET NULL,
    stallion_station TEXT,
    order_date DATE NOT NULL,
    ship_method cavvy.ship_method_enum NOT NULL,
    flight_number TEXT,
    tracking_number TEXT,
    shipped_date DATE,
    expected_arrival DATE,
    actual_arrival DATE,
    dose_count INTEGER,
    semen_type cavvy.semen_type_enum NOT NULL,
    condition_on_arrival TEXT,
    notes TEXT,
    is_historical BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Foaling Events
-- ============================================================
CREATE TABLE cavvy.foaling_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breeding_event_id UUID REFERENCES cavvy.breeding_events(id) ON DELETE SET NULL,
    mare_id UUID NOT NULL REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    foal_id UUID REFERENCES cavvy.horses(id) ON DELETE SET NULL,
    expected_date DATE,
    foaling_watch_started DATE,
    actual_date DATE,
    actual_time TIME,
    outcome cavvy.foaling_outcome,
    complications TEXT,
    vet_attended BOOLEAN,
    placenta_passed BOOLEAN,
    placenta_intact BOOLEAN,
    placenta_weight_lbs NUMERIC(5,2),
    notes TEXT,
    is_historical BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Foaling Prep Observations
-- ============================================================
CREATE TABLE cavvy.foaling_prep_observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    foaling_event_id UUID NOT NULL REFERENCES cavvy.foaling_events(id) ON DELETE CASCADE,
    mare_id UUID NOT NULL REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    udder_development cavvy.udder_development_enum,
    waxing BOOLEAN,
    milk_test_done BOOLEAN,
    milk_calcium_ppm INTEGER,
    milk_ph NUMERIC(4,2),
    behavior_notes TEXT,
    performed_by TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Attachments — generic file attachments for any record
-- ============================================================
CREATE TABLE cavvy.attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type cavvy.entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    storage_url TEXT NOT NULL,
    drive_url TEXT,
    caption TEXT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by TEXT NOT NULL,
    file_type cavvy.file_type_enum NOT NULL DEFAULT 'image',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Documents — registration papers, contracts, coggins, etc.
-- ============================================================
CREATE TABLE cavvy.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id UUID REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    breeding_event_id UUID REFERENCES cavvy.breeding_events(id) ON DELETE CASCADE,
    doc_type cavvy.doc_type_enum NOT NULL,
    drive_url TEXT NOT NULL,
    title TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Costs
-- ============================================================
CREATE TABLE cavvy.costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type cavvy.entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    cost_type cavvy.cost_type_enum NOT NULL,
    amount_usd NUMERIC(10,2) NOT NULL,
    cost_date DATE NOT NULL,
    invoice_doc_url TEXT,
    paid BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Breeding Contracts
-- ============================================================
CREATE TABLE cavvy.breeding_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breeding_event_id UUID REFERENCES cavvy.breeding_events(id) ON DELETE SET NULL,
    mare_id UUID REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    stallion_id UUID NOT NULL REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    drive_url TEXT NOT NULL,
    stud_fee NUMERIC(10,2),
    booking_fee NUMERIC(10,2),
    chute_fee NUMERIC(10,2),
    shipping_cost NUMERIC(10,2),
    shipping_responsibility cavvy.shipping_responsibility_enum,
    lfg_terms TEXT,
    substitute_mare_allowed BOOLEAN,
    embryo_transfer_allowed BOOLEAN,
    registration_requirements TEXT,
    signed_date DATE,
    season_year INTEGER,
    parse_status cavvy.parse_status_enum NOT NULL DEFAULT 'unparsed',
    parsed_raw_json JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Stallion Details
-- ============================================================
CREATE TABLE cavvy.stallion_details (
    horse_id UUID PRIMARY KEY REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    primary_station TEXT,
    station_contact_name TEXT,
    station_phone TEXT,
    station_email TEXT,
    station_address TEXT,
    current_stud_fee NUMERIC(10,2),
    booking_fee NUMERIC(10,2),
    chute_fee NUMERIC(10,2),
    collection_days TEXT,
    semen_type_available TEXT[],
    lfg_terms TEXT,
    seven_panel_status cavvy.seven_panel_status_enum,
    seven_panel_details TEXT,
    seven_panel_doc_url TEXT,
    color_test_results TEXT,
    breed_registry_notes TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Health Events
-- ============================================================
CREATE TABLE cavvy.health_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    horse_id UUID NOT NULL REFERENCES cavvy.horses(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_type TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    vet_present BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Alerts
-- ============================================================
CREATE TABLE cavvy.alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES cavvy.user_profiles(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type cavvy.entity_type_enum,
    entity_id UUID,
    due_date DATE,
    dismissed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Dictation Log
-- ============================================================
CREATE TABLE cavvy.dictation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES cavvy.user_profiles(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    parsed_action JSONB NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT false,
    entity_type cavvy.entity_type_enum,
    entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_horses_dam_id ON cavvy.horses(dam_id);
CREATE INDEX idx_horses_sire_id ON cavvy.horses(sire_id);
CREATE INDEX idx_horses_owned ON cavvy.horses(owned);
CREATE INDEX idx_horses_broodmare_active ON cavvy.horses(broodmare_active);

CREATE INDEX idx_heat_observations_mare_id ON cavvy.heat_observations(mare_id);
CREATE INDEX idx_heat_observations_date ON cavvy.heat_observations(observation_date DESC);

CREATE INDEX idx_breeding_events_mare_id ON cavvy.breeding_events(mare_id);
CREATE INDEX idx_breeding_events_stallion_id ON cavvy.breeding_events(stallion_id);
CREATE INDEX idx_breeding_events_season_year ON cavvy.breeding_events(season_year);
CREATE INDEX idx_breeding_events_date ON cavvy.breeding_events(breeding_date DESC);

CREATE INDEX idx_ultrasound_checks_breeding_event_id ON cavvy.ultrasound_checks(breeding_event_id);
CREATE INDEX idx_ultrasound_checks_mare_id ON cavvy.ultrasound_checks(mare_id);

CREATE INDEX idx_hormone_treatments_mare_id ON cavvy.hormone_treatments(mare_id);
CREATE INDEX idx_hormone_treatments_date ON cavvy.hormone_treatments(treatment_date DESC);

CREATE INDEX idx_semen_shipments_breeding_event_id ON cavvy.semen_shipments(breeding_event_id);
CREATE INDEX idx_semen_shipments_mare_id ON cavvy.semen_shipments(mare_id);

CREATE INDEX idx_foaling_events_breeding_event_id ON cavvy.foaling_events(breeding_event_id);
CREATE INDEX idx_foaling_events_mare_id ON cavvy.foaling_events(mare_id);
CREATE INDEX idx_foaling_events_foal_id ON cavvy.foaling_events(foal_id);

CREATE INDEX idx_foaling_prep_foaling_event_id ON cavvy.foaling_prep_observations(foaling_event_id);

CREATE INDEX idx_attachments_entity ON cavvy.attachments(entity_type, entity_id);
CREATE INDEX idx_documents_horse_id ON cavvy.documents(horse_id);

CREATE INDEX idx_alerts_user_id ON cavvy.alerts(user_id);
CREATE INDEX idx_alerts_dismissed ON cavvy.alerts(dismissed);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION cavvy.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_horses_updated_at BEFORE UPDATE ON cavvy.horses
    FOR EACH ROW EXECUTE FUNCTION cavvy.update_updated_at_column();

CREATE TRIGGER update_stallion_details_updated_at BEFORE UPDATE ON cavvy.stallion_details
    FOR EACH ROW EXECUTE FUNCTION cavvy.update_updated_at_column();

-- ============================================================
-- Role helpers — SECURITY DEFINER so RLS on user_profiles doesn't
-- recurse. Live in cavvy (user objects in the auth schema are no
-- longer allowed on hosted Supabase).
-- ============================================================
CREATE OR REPLACE FUNCTION cavvy.user_has_any_role(required_roles cavvy.user_role[])
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM cavvy.user_profiles
        WHERE id = auth.uid() AND role = ANY(required_roles)
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = cavvy, auth;

CREATE OR REPLACE FUNCTION cavvy.user_has_role(required_role cavvy.user_role)
RETURNS BOOLEAN AS $$
    SELECT cavvy.user_has_any_role(ARRAY[required_role]);
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = cavvy, auth;

-- ============================================================
-- Grants — RLS is the real gate; grants just let PostgREST through.
-- ============================================================
GRANT ALL ON ALL TABLES IN SCHEMA cavvy TO authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA cavvy TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA cavvy GRANT ALL ON TABLES TO authenticated, service_role;

-- ============================================================
-- Row Level Security
-- Owner/staff: full CRUD. Vet: read everything, insert observation-type
-- records (heat obs, ultrasounds, foalings, prep, hormone shots, attachments).
-- Shared-project users with no cavvy.user_profiles row: no access at all.
-- ============================================================
ALTER TABLE cavvy.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.heat_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.breeding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.ultrasound_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.hormone_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.semen_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.foaling_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.foaling_prep_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.breeding_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.stallion_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.health_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cavvy.dictation_log ENABLE ROW LEVEL SECURITY;

-- user_profiles
CREATE POLICY "read own profile" ON cavvy.user_profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "update own profile" ON cavvy.user_profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "owners read all profiles" ON cavvy.user_profiles
    FOR SELECT USING (cavvy.user_has_role('owner'));
CREATE POLICY "owners insert profiles" ON cavvy.user_profiles
    FOR INSERT WITH CHECK (cavvy.user_has_role('owner'));
CREATE POLICY "owners update all profiles" ON cavvy.user_profiles
    FOR UPDATE USING (cavvy.user_has_role('owner'));
CREATE POLICY "owners delete profiles" ON cavvy.user_profiles
    FOR DELETE USING (cavvy.user_has_role('owner'));

-- Full-CRUD tables: owner/staff write, any Cavvy role reads
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'horses', 'breeding_events', 'semen_shipments', 'documents',
        'costs', 'breeding_contracts', 'stallion_details', 'health_events'
    ]
    LOOP
        EXECUTE format('
            CREATE POLICY "cavvy users read" ON cavvy.%I
                FOR SELECT USING (cavvy.user_has_any_role(ARRAY[''owner'', ''staff'', ''vet'']::cavvy.user_role[]));
            CREATE POLICY "owner staff insert" ON cavvy.%I
                FOR INSERT WITH CHECK (cavvy.user_has_any_role(ARRAY[''owner'', ''staff'']::cavvy.user_role[]));
            CREATE POLICY "owner staff update" ON cavvy.%I
                FOR UPDATE USING (cavvy.user_has_any_role(ARRAY[''owner'', ''staff'']::cavvy.user_role[]));
            CREATE POLICY "owner staff delete" ON cavvy.%I
                FOR DELETE USING (cavvy.user_has_any_role(ARRAY[''owner'', ''staff'']::cavvy.user_role[]));
        ', t, t, t, t);
    END LOOP;
END $$;

-- Observation tables: vets can also insert
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY[
        'heat_observations', 'ultrasound_checks', 'hormone_treatments',
        'foaling_events', 'foaling_prep_observations', 'attachments'
    ]
    LOOP
        EXECUTE format('
            CREATE POLICY "cavvy users read" ON cavvy.%I
                FOR SELECT USING (cavvy.user_has_any_role(ARRAY[''owner'', ''staff'', ''vet'']::cavvy.user_role[]));
            CREATE POLICY "cavvy users insert" ON cavvy.%I
                FOR INSERT WITH CHECK (cavvy.user_has_any_role(ARRAY[''owner'', ''staff'', ''vet'']::cavvy.user_role[]));
            CREATE POLICY "owner staff update" ON cavvy.%I
                FOR UPDATE USING (cavvy.user_has_any_role(ARRAY[''owner'', ''staff'']::cavvy.user_role[]));
            CREATE POLICY "owner staff delete" ON cavvy.%I
                FOR DELETE USING (cavvy.user_has_any_role(ARRAY[''owner'', ''staff'']::cavvy.user_role[]));
        ', t, t, t, t);
    END LOOP;
END $$;

-- alerts / dictation_log: scoped to the owning user
CREATE POLICY "own alerts" ON cavvy.alerts
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own dictation log" ON cavvy.dictation_log
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON SCHEMA cavvy IS 'Cavvy equine breeding management — namespaced to coexist with mwes-invoice and spa-scheduler in the shared Supabase project';
COMMENT ON TABLE cavvy.horses IS 'Central table for all animals - mares, foals, stallions';
COMMENT ON TABLE cavvy.hormone_treatments IS 'Estrumate/lutalyse short-cycling shots and other hormone treatments; planning projections are computed from treatment_date in app code';
