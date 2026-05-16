// Database types matching Supabase schema
// Auto-generated types can replace this later with: npx supabase gen types typescript

export type SexEnum = 'mare' | 'stallion' | 'gelding' | 'filly' | 'colt'
export type HeatObservationMethod = 'visual' | 'ultrasound' | 'palpation' | 'behavior_only'
export type UterineTone = 'flaccid' | 'soft' | 'toned'
export type HeatObservationPurpose = 'routine_check' | 'pre_breeding' | 'post_breeding' | 'other'
export type BreedingMethod = 'live_cover' | 'ai_fresh' | 'ai_cooled' | 'ai_frozen' | 'embryo_transfer'
export type UltrasoundResult = 'open' | 'in_foal' | 'twins' | 'lost' | 'unclear'
export type SemenType = 'fresh' | 'cooled' | 'frozen'
export type ShipMethod = 'ups' | 'fedex' | 'courier_counter_to_counter' | 'other'
export type FoalingOutcome = 'live' | 'stillborn' | 'aborted' | 'dystocia_live' | 'dystocia_loss'
export type UdderDevelopment = 'none' | 'filling' | 'full' | 'very_full' | 'dripping'
export type UserRole = 'owner' | 'staff' | 'vet'
export type EntityType = 'horse' | 'breeding_event' | 'heat_observation' | 'ultrasound_check' | 'foaling_event' | 'foaling_prep' | 'semen_shipment' | 'other'
export type FileType = 'image' | 'video' | 'pdf' | 'other'
export type DocType = 'contract' | 'coggins' | 'registration' | 'health_cert' | 'vet_record' | 'other'
export type CostType = 'stud_fee' | 'shipping' | 'semen' | 'vet_ultrasound' | 'vet_other' | 'mare_care' | 'registration' | 'other'
export type ShippingResponsibility = 'mare_owner' | 'stallion_owner' | 'split'
export type ParseStatus = 'unparsed' | 'parsed_unconfirmed' | 'confirmed' | 'manual_entry'
export type SevenPanelStatus = 'clear' | 'n_n' | 'carrier' | 'unknown'

// Database Tables
export interface UserProfile {
  id: string
  display_name: string
  role: UserRole
  email: string
  phone?: string
  created_at: string
}

export interface Horse {
  id: string
  registered_name?: string
  barn_name?: string
  aqha_number?: string
  sex: SexEnum
  dob?: string
  aqha_age_year?: number
  color?: string
  markings?: string
  sire_id?: string
  dam_id?: string
  owned: boolean
  acquired_date?: string
  disposition_date?: string
  disposition_notes?: string
  drive_folder_url?: string
  photos_album_url?: string
  broodmare_active: boolean
  created_at: string
  updated_at: string
}

export interface HeatObservation {
  id: string
  mare_id: string
  observation_date: string
  method: HeatObservationMethod
  in_heat: boolean
  standing?: boolean
  stud_interest?: string
  left_ovary_follicle_mm?: number
  right_ovary_follicle_mm?: number
  left_ovary_notes?: string
  right_ovary_notes?: string
  uterine_edema_score?: number
  uterine_tone?: UterineTone
  cervix_notes?: string
  ovulation_confirmed?: boolean
  performed_by: string
  vet_present: boolean
  purpose: HeatObservationPurpose
  notes?: string
  is_historical: boolean
  created_at: string
}

export interface BreedingEvent {
  id: string
  mare_id: string
  stallion_id?: string
  stallion_name_freetext?: string
  method: BreedingMethod
  breeding_date: string
  pulled_date?: string
  stallion_station?: string
  contract_doc_url?: string
  notes?: string
  season_year: number
  is_historical: boolean
  created_at: string
}

export interface UltrasoundCheck {
  id: string
  breeding_event_id: string
  mare_id: string
  check_date: string
  days_post_breeding: number
  result: UltrasoundResult
  performed_by: string
  vet_present: boolean
  notes?: string
  image_urls?: string[]
  is_historical: boolean
  created_at: string
}

export interface SemenShipment {
  id: string
  breeding_event_id?: string
  mare_id: string
  stallion_id?: string
  stallion_station?: string
  order_date: string
  ship_method: ShipMethod
  flight_number?: string
  tracking_number?: string
  shipped_date?: string
  expected_arrival?: string
  actual_arrival?: string
  dose_count?: number
  semen_type: SemenType
  condition_on_arrival?: string
  notes?: string
  is_historical: boolean
  created_at: string
}

export interface FoalingEvent {
  id: string
  breeding_event_id?: string
  mare_id: string
  foal_id?: string
  expected_date?: string
  foaling_watch_started?: string
  actual_date?: string
  actual_time?: string
  outcome?: FoalingOutcome
  complications?: string
  vet_attended?: boolean
  placenta_passed?: boolean
  placenta_intact?: boolean
  placenta_weight_lbs?: number
  notes?: string
  is_historical: boolean
  created_at: string
}

export interface FoalingPrepObservation {
  id: string
  foaling_event_id: string
  mare_id: string
  observation_date: string
  udder_development?: UdderDevelopment
  waxing?: boolean
  milk_test_done?: boolean
  milk_calcium_ppm?: number
  milk_ph?: number
  behavior_notes?: string
  performed_by: string
  notes?: string
  created_at: string
}

export interface Attachment {
  id: string
  entity_type: EntityType
  entity_id: string
  storage_url: string
  drive_url?: string
  caption?: string
  captured_at: string
  uploaded_by: string
  file_type: FileType
  created_at: string
}

export interface Document {
  id: string
  horse_id?: string
  breeding_event_id?: string
  doc_type: DocType
  drive_url: string
  title: string
  uploaded_at: string
}

export interface Cost {
  id: string
  entity_type: EntityType
  entity_id: string
  cost_type: CostType
  amount_usd: number
  cost_date: string
  invoice_doc_url?: string
  paid: boolean
  notes?: string
  created_at: string
}

export interface BreedingContract {
  id: string
  breeding_event_id?: string
  mare_id?: string
  stallion_id: string
  drive_url: string
  stud_fee?: number
  booking_fee?: number
  chute_fee?: number
  shipping_cost?: number
  shipping_responsibility?: ShippingResponsibility
  lfg_terms?: string
  substitute_mare_allowed?: boolean
  embryo_transfer_allowed?: boolean
  registration_requirements?: string
  signed_date?: string
  season_year?: number
  parse_status: ParseStatus
  parsed_raw_json?: Record<string, any>
  notes?: string
  created_at: string
}

export interface StallionDetails {
  horse_id: string
  primary_station?: string
  station_contact_name?: string
  station_phone?: string
  station_email?: string
  station_address?: string
  current_stud_fee?: number
  booking_fee?: number
  chute_fee?: number
  collection_days?: string
  semen_type_available?: string[]
  lfg_terms?: string
  seven_panel_status?: SevenPanelStatus
  seven_panel_details?: string
  seven_panel_doc_url?: string
  color_test_results?: string
  breed_registry_notes?: string
  notes?: string
  updated_at: string
}

export interface HealthEvent {
  id: string
  horse_id: string
  event_date: string
  event_type: string
  performed_by: string
  vet_present: boolean
  notes?: string
  created_at: string
}

export interface Alert {
  id: string
  user_id: string
  alert_type: string
  message: string
  entity_type?: EntityType
  entity_id?: string
  due_date?: string
  dismissed: boolean
  created_at: string
}

export interface DictationLog {
  id: string
  user_id: string
  transcript: string
  parsed_action: Record<string, any>
  confirmed: boolean
  entity_type?: EntityType
  entity_id?: string
  created_at: string
}

// Extended types with relations (for joins)
export interface HorseWithRelations extends Horse {
  sire?: Horse
  dam?: Horse
  offspring?: Horse[]
}

export interface BreedingEventWithRelations extends BreedingEvent {
  mare?: Horse
  stallion?: Horse
  ultrasound_checks?: UltrasoundCheck[]
  foaling_event?: FoalingEvent
}
