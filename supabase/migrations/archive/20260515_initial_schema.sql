-- BreMan Database Schema
-- Full schema including MVP and post-MVP tables
-- Migrate everything at once to avoid second migration later

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom types/enums
CREATE TYPE sex_enum AS ENUM ('mare', 'stallion', 'gelding', 'filly', 'colt');
CREATE TYPE heat_observation_method AS ENUM ('visual', 'ultrasound', 'palpation', 'behavior_only');
CREATE TYPE uterine_tone_enum AS ENUM ('flaccid', 'soft', 'toned');
CREATE TYPE heat_observation_purpose AS ENUM ('routine_check', 'pre_breeding', 'post_breeding', 'other');
CREATE TYPE breeding_method AS ENUM ('live_cover', 'ai_fresh', 'ai_cooled', 'ai_frozen', 'embryo_transfer');
CREATE TYPE ultrasound_result AS ENUM ('open', 'in_foal', 'twins', 'lost', 'unclear');
CREATE TYPE semen_type_enum AS ENUM ('fresh', 'cooled', 'frozen');
CREATE TYPE ship_method_enum AS ENUM ('ups', 'fedex', 'courier_counter_to_counter', 'other');
CREATE TYPE foaling_outcome AS ENUM ('live', 'stillborn', 'aborted', 'dystocia_live', 'dystocia_loss');
CREATE TYPE udder_development_enum AS ENUM ('none', 'filling', 'full', 'very_full', 'dripping');
CREATE TYPE user_role AS ENUM ('owner', 'staff', 'vet');
CREATE TYPE entity_type_enum AS ENUM ('horse', 'breeding_event', 'heat_observation', 'ultrasound_check', 'foaling_event', 'foaling_prep', 'semen_shipment', 'other');
CREATE TYPE file_type_enum AS ENUM ('image', 'video', 'pdf', 'other');
CREATE TYPE doc_type_enum AS ENUM ('contract', 'coggins', 'registration', 'health_cert', 'vet_record', 'other');
CREATE TYPE cost_type_enum AS ENUM ('stud_fee', 'shipping', 'semen', 'vet_ultrasound', 'vet_other', 'mare_care', 'registration', 'other');
CREATE TYPE shipping_responsibility_enum AS ENUM ('mare_owner', 'stallion_owner', 'split');
CREATE TYPE parse_status_enum AS ENUM ('unparsed', 'parsed_unconfirmed', 'confirmed', 'manual_entry');
CREATE TYPE seven_panel_status_enum AS ENUM ('clear', 'n_n', 'carrier', 'unknown');

-- ============================================================
-- User Profiles
-- ============================================================
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'staff',
    email TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Horses - Central table for all animals
-- ============================================================
CREATE TABLE horses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    registered_name TEXT,
    barn_name TEXT,
    aqha_number TEXT,
    sex sex_enum NOT NULL,
    dob DATE,
    aqha_age_year INTEGER,
    color TEXT,
    markings TEXT,
    sire_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    dam_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    owned BOOLEAN NOT NULL DEFAULT true,
    acquired_date DATE,
    disposition_date DATE,
    disposition_notes TEXT,
    drive_folder_url TEXT,
    photos_album_url TEXT,
    broodmare_active BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Heat Observations - Reproductive cycle tracking
-- ============================================================
CREATE TABLE heat_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mare_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    method heat_observation_method NOT NULL,
    in_heat BOOLEAN NOT NULL,
    standing BOOLEAN,
    stud_interest TEXT,
    left_ovary_follicle_mm INTEGER,
    right_ovary_follicle_mm INTEGER,
    left_ovary_notes TEXT,
    right_ovary_notes TEXT,
    uterine_edema_score INTEGER CHECK (uterine_edema_score BETWEEN 0 AND 4),
    uterine_tone uterine_tone_enum,
    cervix_notes TEXT,
    ovulation_confirmed BOOLEAN,
    performed_by TEXT NOT NULL,
    vet_present BOOLEAN NOT NULL DEFAULT false,
    purpose heat_observation_purpose NOT NULL DEFAULT 'routine_check',
    notes TEXT,
    is_historical BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Breeding Events
-- ============================================================
CREATE TABLE breeding_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mare_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    stallion_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    stallion_name_freetext TEXT,
    method breeding_method NOT NULL,
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
-- Ultrasound Checks - Pregnancy confirmation checks
-- ============================================================
CREATE TABLE ultrasound_checks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breeding_event_id UUID NOT NULL REFERENCES breeding_events(id) ON DELETE CASCADE,
    mare_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    days_post_breeding INTEGER NOT NULL,
    result ultrasound_result NOT NULL,
    performed_by TEXT NOT NULL,
    vet_present BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    image_urls TEXT[],
    is_historical BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Semen Shipments
-- ============================================================
CREATE TABLE semen_shipments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breeding_event_id UUID REFERENCES breeding_events(id) ON DELETE SET NULL,
    mare_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    stallion_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    stallion_station TEXT,
    order_date DATE NOT NULL,
    ship_method ship_method_enum NOT NULL,
    flight_number TEXT,
    tracking_number TEXT,
    shipped_date DATE,
    expected_arrival DATE,
    actual_arrival DATE,
    dose_count INTEGER,
    semen_type semen_type_enum NOT NULL,
    condition_on_arrival TEXT,
    notes TEXT,
    is_historical BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Foaling Events
-- ============================================================
CREATE TABLE foaling_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breeding_event_id UUID REFERENCES breeding_events(id) ON DELETE SET NULL,
    mare_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    foal_id UUID REFERENCES horses(id) ON DELETE SET NULL,
    expected_date DATE,
    foaling_watch_started DATE,
    actual_date DATE,
    actual_time TIME,
    outcome foaling_outcome,
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
CREATE TABLE foaling_prep_observations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    foaling_event_id UUID NOT NULL REFERENCES foaling_events(id) ON DELETE CASCADE,
    mare_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    observation_date DATE NOT NULL,
    udder_development udder_development_enum,
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
-- Attachments - Generic file attachments for any record
-- ============================================================
CREATE TABLE attachments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    storage_url TEXT NOT NULL,
    drive_url TEXT,
    caption TEXT,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    uploaded_by TEXT NOT NULL,
    file_type file_type_enum NOT NULL DEFAULT 'image',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Documents - Document management
-- ============================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    horse_id UUID REFERENCES horses(id) ON DELETE CASCADE,
    breeding_event_id UUID REFERENCES breeding_events(id) ON DELETE CASCADE,
    doc_type doc_type_enum NOT NULL,
    drive_url TEXT NOT NULL,
    title TEXT NOT NULL,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Costs - Financial tracking (optional, basic v1)
-- ============================================================
CREATE TABLE costs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    entity_type entity_type_enum NOT NULL,
    entity_id UUID NOT NULL,
    cost_type cost_type_enum NOT NULL,
    amount_usd NUMERIC(10,2) NOT NULL,
    cost_date DATE NOT NULL,
    invoice_doc_url TEXT,
    paid BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Breeding Contracts - AI-parsed contract data
-- ============================================================
CREATE TABLE breeding_contracts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    breeding_event_id UUID REFERENCES breeding_events(id) ON DELETE SET NULL,
    mare_id UUID REFERENCES horses(id) ON DELETE CASCADE,
    stallion_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    drive_url TEXT NOT NULL,
    stud_fee NUMERIC(10,2),
    booking_fee NUMERIC(10,2),
    chute_fee NUMERIC(10,2),
    shipping_cost NUMERIC(10,2),
    shipping_responsibility shipping_responsibility_enum,
    lfg_terms TEXT,
    substitute_mare_allowed BOOLEAN,
    embryo_transfer_allowed BOOLEAN,
    registration_requirements TEXT,
    signed_date DATE,
    season_year INTEGER,
    parse_status parse_status_enum NOT NULL DEFAULT 'unparsed',
    parsed_raw_json JSONB,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Stallion Details - Extended info for stallions
-- ============================================================
CREATE TABLE stallion_details (
    horse_id UUID PRIMARY KEY REFERENCES horses(id) ON DELETE CASCADE,
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
    seven_panel_status seven_panel_status_enum,
    seven_panel_details TEXT,
    seven_panel_doc_url TEXT,
    color_test_results TEXT,
    breed_registry_notes TEXT,
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Health Events - Light EMR tracking (v2)
-- ============================================================
CREATE TABLE health_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    horse_id UUID NOT NULL REFERENCES horses(id) ON DELETE CASCADE,
    event_date DATE NOT NULL,
    event_type TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    vet_present BOOLEAN NOT NULL DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Alerts - System-generated alerts (v2, notifications)
-- ============================================================
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    message TEXT NOT NULL,
    entity_type entity_type_enum,
    entity_id UUID,
    due_date DATE,
    dismissed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Dictation Log - Audit trail for AI parsing
-- ============================================================
CREATE TABLE dictation_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    transcript TEXT NOT NULL,
    parsed_action JSONB NOT NULL,
    confirmed BOOLEAN NOT NULL DEFAULT false,
    entity_type entity_type_enum,
    entity_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes for performance
-- ============================================================
CREATE INDEX idx_horses_dam_id ON horses(dam_id);
CREATE INDEX idx_horses_sire_id ON horses(sire_id);
CREATE INDEX idx_horses_owned ON horses(owned);
CREATE INDEX idx_horses_broodmare_active ON horses(broodmare_active);

CREATE INDEX idx_heat_observations_mare_id ON heat_observations(mare_id);
CREATE INDEX idx_heat_observations_date ON heat_observations(observation_date DESC);

CREATE INDEX idx_breeding_events_mare_id ON breeding_events(mare_id);
CREATE INDEX idx_breeding_events_stallion_id ON breeding_events(stallion_id);
CREATE INDEX idx_breeding_events_season_year ON breeding_events(season_year);
CREATE INDEX idx_breeding_events_date ON breeding_events(breeding_date DESC);

CREATE INDEX idx_ultrasound_checks_breeding_event_id ON ultrasound_checks(breeding_event_id);
CREATE INDEX idx_ultrasound_checks_mare_id ON ultrasound_checks(mare_id);

CREATE INDEX idx_semen_shipments_breeding_event_id ON semen_shipments(breeding_event_id);
CREATE INDEX idx_semen_shipments_mare_id ON semen_shipments(mare_id);

CREATE INDEX idx_foaling_events_breeding_event_id ON foaling_events(breeding_event_id);
CREATE INDEX idx_foaling_events_mare_id ON foaling_events(mare_id);
CREATE INDEX idx_foaling_events_foal_id ON foaling_events(foal_id);

CREATE INDEX idx_foaling_prep_foaling_event_id ON foaling_prep_observations(foaling_event_id);

CREATE INDEX idx_attachments_entity ON attachments(entity_type, entity_id);

CREATE INDEX idx_alerts_user_id ON alerts(user_id);
CREATE INDEX idx_alerts_dismissed ON alerts(dismissed);

-- ============================================================
-- Updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_horses_updated_at BEFORE UPDATE ON horses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stallion_details_updated_at BEFORE UPDATE ON stallion_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- Row Level Security (RLS) Setup
-- Will be populated in next migration with detailed policies
-- ============================================================
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE horses ENABLE ROW LEVEL SECURITY;
ALTER TABLE heat_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ultrasound_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE semen_shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE foaling_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE foaling_prep_observations ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE breeding_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE stallion_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictation_log ENABLE ROW LEVEL SECURITY;

-- Basic policies (to be refined)
-- Owner/Staff get full access, Vet gets read + insert on observations/checks

-- User profiles: users can read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

-- Horses: authenticated users can read, owner/staff can insert/update/delete
CREATE POLICY "Authenticated users can read horses" ON horses
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Owner and staff can insert horses" ON horses
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('owner', 'staff')
        )
    );

CREATE POLICY "Owner and staff can update horses" ON horses
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('owner', 'staff')
        )
    );

CREATE POLICY "Owner and staff can delete horses" ON horses
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_profiles
            WHERE id = auth.uid() AND role IN ('owner', 'staff')
        )
    );

-- Similar patterns for other tables...
-- (Full RLS policies to be completed in Phase 1)

COMMENT ON TABLE horses IS 'Central table for all animals - mares, foals, stallions';
COMMENT ON TABLE heat_observations IS 'Reproductive cycle tracking with varying detail levels';
COMMENT ON TABLE breeding_events IS 'Breeding actions - covers, AI, embryo transfer';
COMMENT ON TABLE ultrasound_checks IS 'Pregnancy confirmation checks at standard intervals';
COMMENT ON TABLE foaling_events IS 'Birth records linked to breeding events';
COMMENT ON TABLE attachments IS 'Generic file attachments tied to any record';
COMMENT ON TABLE dictation_log IS 'Audit trail for AI-parsed dictation';
