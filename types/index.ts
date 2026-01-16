export type CycleCategory = 'Quickfire' | 'Hunter' | 'Accumulator' | 'sports';
// Added 'pending_extension' here to fix your overlapping types error
export type CycleStatus = 'active' | 'success' | 'failed' | 'completed' | 'pending_extension';

export interface Cycle {
  id: string;
  name: string;
  category: CycleCategory | string; 
  status: CycleStatus;
  current_week: number;
  total_wins?: number; // Optional in new schema
  target_wins?: number;
  target_desc: string;
  end_date: string;    // Added: This fixes the "Property does not exist" error
  events?: Event[];
  created_at?: string;
}

export interface Event {
  id: string;          // Switched to string for UUID compatibility
  jackpot_id: string;  // Added for the new Jackpot-level logic
  cycle_id?: string;   
  week_number: number;
  platform: string;
  event_name: string;
  deadline: string;
  is_active: boolean;
  result_status?: 'pending' | 'hit' | 'miss';
  predictions?: Prediction[];
}

export interface Prediction {
  id: string;
  event_id: string;
  match_id: number;
  home_team: string;
  away_team: string;
  match_name: string;
  tip?: string;        // Added to match the ingest logic
  strat_a_pick: '1' | 'X' | '2' | string;
  strat_b_pick: '1' | 'X' | '2' | string;
  rationale?: string;
  is_free: boolean;
  result?: '1' | 'X' | '2' | null | string;
  is_correct?: boolean; // Added for the SQL Trigger logic
  status: 'pending' | 'win' | 'loss' | 'void' | string;
  confidence?: number;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  is_admin: boolean;
  credits: number;
}

export interface DailyTip {
  id: number;
  match_name: string;
  tip: string;
  odds: string;
  confidence: 'High' | 'Medium' | 'Risky';
  created_at: string;
}