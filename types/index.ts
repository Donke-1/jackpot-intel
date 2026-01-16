export type CycleCategory = 'Quickfire' | 'Hunter' | 'Accumulator';
export type CycleStatus = 'active' | 'success' | 'failed' | 'completed';

export interface Cycle {
  id: string;           // "HUNTER-JAN-26"
  name: string;         // "The January Hunter"
  category: CycleCategory; 
  status: CycleStatus;
  current_week: number; // 1, 2, 3...
  total_wins: number;
  target_wins: number;
  target_desc: string;  // "Hit 12/17 Bonus"
  events?: Event[];     // Optional: Loaded via join
}

export interface Event {
  id: number;
  cycle_id: string;
  week_number: number;
  platform: 'SportPesa' | 'SportyBet' | 'Mozzart';
  event_name: string;
  deadline: string;     // ISO Date String
  is_active: boolean;
  result_status: 'pending' | 'hit' | 'miss';
  predictions?: Prediction[];
}

export interface Prediction {
  id: number;
  event_id: number;
  match_id: number;
  home_team: string;
  away_team: string;
  match_time: string;
  strat_a_pick: '1' | 'X' | '2';
  strat_b_pick: '1' | 'X' | '2';
  rationale: string;
  is_free: boolean;
  result?: '1' | 'X' | '2' | null;
  status: 'pending' | 'win' | 'loss' | 'void';
}

export interface Participant {
  id: number;
  user_id: string;
  cycle_id: string;
  sites_selected: string[] | null; // e.g., ['SportPesa', 'SportyBet']
  personal_outcome: 'pending' | 'won' | 'lost' | 'missed_opportunity';
  rollover_credit: boolean;
  checklist_completed: boolean;
  joined_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username?: string;
  is_admin: boolean;
  credits: number;
}

// --- NEW ADDITION ---
export interface DailyTip {
  id: number;
  match_name: string;
  tip: string;
  odds: string;
  confidence: 'High' | 'Medium' | 'Risky';
  created_at: string;
}