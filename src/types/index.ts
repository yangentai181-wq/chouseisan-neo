// Event types
export type EventMode = "regular" | "meeting" | "event";

export interface Event {
  id: string;
  host_token: string;
  title: string;
  description: string | null;
  mode: EventMode;
  duration_minutes: number | null;
  is_anonymous: boolean;
  status: "open" | "finalized";
  finalized_candidate_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Candidate {
  id: string;
  event_id: string;
  date: string; // ISO date string
  start_time: string | null; // HH:mm format
  end_time: string | null;
  position: number;
}

export interface Vote {
  id: string;
  event_id: string;
  participant_name: string;
  participant_token: string;
}

export type Availability = "available" | "maybe" | "unavailable";

export interface VoteDetail {
  id: string;
  vote_id: string;
  candidate_id: string;
  availability: Availability;
  preference: number | null; // 定例モード: 1=第1希望, 2=第2希望, 3=第3希望, null=希望なし
}

// API types
export interface CreateEventRequest {
  title: string;
  description?: string;
  candidates: {
    date: string;
    start_time?: string;
    end_time?: string;
  }[];
}

export interface CreateEventResponse {
  event_id: string;
  host_token: string;
  share_url: string;
}

export interface CreateVoteRequest {
  participant_name: string;
  participant_token?: string; // for editing existing vote
  votes: {
    candidate_id: string;
    availability: Availability;
  }[];
}

// View types (with joined data)
export interface EventWithCandidates extends Event {
  candidates: Candidate[];
}

export interface VoteWithDetails extends Vote {
  vote_details: VoteDetail[];
}

export interface EventView {
  event: Event;
  candidates: Candidate[];
  votes: VoteWithDetails[];
}
