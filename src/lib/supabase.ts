import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'coordinator' | 'micro';

export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  role: UserRole;
  phone?: string;
  region_id?: string;
  city_id?: string;
  region_name?: string;
  supervisor_id?: string;
  active: boolean;
  document_number?: string;
  photo_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Party {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface Position {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

export interface City {
  id: string;
  name: string;
  region_id?: string;
  created_at: string;
}

export interface Candidate {
  id: string;
  name: string;
  party_id: string;
  position_id: string;
  city_id: string;
  // Optional relations for select/join
  parties?: Party;
  positions?: Position;
  cities?: City;
  number: string;
  photo_url: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface Voter {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  neighborhood?: string;
  fidelity_score: number;
  last_visit_at: string;
  observations?: string;
  photo_url?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  created_by: string;
  coordinator_id?: string;
}

export interface FieldReport {
  id: string;
  micro_id: string;
  voter_id?: string;
  description: string;
  photo_url?: string;
  location_lat?: number;
  location_lng?: number;
  visit_type: string;
  created_at: string;
}
