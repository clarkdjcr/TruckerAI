export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'COMPANY_ADMIN' | 'DISPATCHER' | 'DRIVER';
  company: number | null;
}

export interface DriverProfile {
  id: number;
  duty_status: 'off_duty' | 'sleeper_berth' | 'driving' | 'on_duty';
  shift_start: string | null;
  driving_minutes_used: number;
  on_duty_minutes_used: number;
  cycle_minutes_used: number;
  driving_minutes_since_break: number;
  cdl_number: string;
  cdl_state: string;
  truck_number: string;
  trailer_number: string;
}

export interface HOSData {
  drive_remaining_hrs: number;
  window_remaining_hrs: number;
  cycle_remaining_hrs: number;
  break_required: boolean;
  duty_status: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface Load {
  id: number;
  load_number: string;
  status: string;
  equipment_type: string;
  pickup_date: string;
  delivery_date: string;
  commodity: string;
  weight_lbs: number | null;
  shipper: Customer;
  consignee: Customer;
  special_instructions: string;
  conversation: number | null;
}

export interface Customer {
  id: number;
  business_name: string;
  city: string;
  state: string;
  address_line1: string;
  zip_code: string;
  contact_name: string;
  phone: string;
}

export interface Message {
  id: number;
  sender: number;
  sender_name: string;
  body: string;
  message_type: 'text' | 'dispatch' | 'alert' | 'system';
  created_at: string;
  read_at: string | null;
  metadata: Record<string, any>;
}

export interface Conversation {
  id: number;
  dispatcher: number;
  driver: number;
  driver_name: string;
  dispatcher_name: string;
  created_at: string;
}

export interface Route {
  id: number;
  origin_address: string;
  destination_address: string;
  distance_miles: number;
  duration_minutes: number;
  traffic_duration_minutes: number;
  hos_feasible: boolean;
  weather_alerts: string[];
  summary: string;
  created_at: string;
}

export interface FleetDriver {
  driver_id: number;
  driver_name: string;
  truck_number: string;
  duty_status: string;
  latitude: number | null;
  longitude: number | null;
  speed_mph: number | null;
  fuel_level_pct: number | null;
  estimated_range_miles: number | null;
  avg_mpg: number | null;
  last_seen: string | null;
  load_number: string | null;
  destination: string | null;
}

export interface MaintenanceAlert {
  vehicle: string;
  description: string;
  alert_level: 'overdue' | 'due' | 'approaching';
  is_critical: boolean;
  next_due_date: string | null;
  next_due_odometer: number | null;
}

export interface MaintenanceVehicle {
  vehicle_id: number;
  truck_number: string;
  make_model: string;
  current_odometer: number;
  alerts: (MaintenanceAlert & { schedule_id: number; current_odometer: number })[];
  open_reports: number;
  urgent_reports: number;
}

export interface MaintenanceRecord {
  id: number;
  vehicle: number;
  vehicle_label: string;
  reported_by: number | null;
  reported_by_name: string | null;
  maintenance_type: string;
  record_status: string;
  description: string;
  driver_notes: string;
  is_urgent: boolean;
  created_at: string;
}

export interface CustomerComm {
  id: number;
  driver_name: string;
  customer_name: string;
  load_number: string | null;
  comm_type: string;
  channel: string;
  comm_status: string;
  message_body: string;
  sent_to_email: string;
  sent_to_phone: string;
  estimated_arrival: string | null;
  sent_at: string | null;
  response_text: string;
  created_at: string;
}

export interface HealthConsent {
  apple_watch_connected: boolean;
  consent_heart_rate: boolean;
  consent_hrv: boolean;
  consent_sleep: boolean;
  consent_activity: boolean;
  share_fatigue_with_dispatcher: boolean;
  consent_given_at: string | null;
  any_monitoring_active: boolean;
}

export interface OnboardingStep {
  step: string;
  label: string;
  complete: boolean;
  optional?: boolean;
  description: string;
  action_url?: string;
}

export interface OnboardingStatus {
  onboarding_complete: boolean;
  checklist: OnboardingStep[];
}

export interface RequiredDoc {
  key: string;
  label: string;
  description: string;
  where_to_find: string;
  required_for: string;
}