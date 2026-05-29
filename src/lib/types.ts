// Shared types for Success Signal Analysis.

/** The visitor's stated optimization goal. Drives scoring + analysis. */
export type Goal =
  | "opens"
  | "clicks"
  | "sales"
  | "replies"
  | "unsubscribes"
  | "other";

export interface AnalyzeInput {
  kitApiKey: string;
  email: string;
  goal: Goal;
  goalOther?: string;
  businessModel: string;
  /** Free-text context answers from the form. */
  context: {
    accomplishing?: string;
    surprised?: string;
    working?: string;
  };
  /** How many recent (sent) broadcasts to analyze. Default 20. */
  limit: number;
}

/** Raw broadcast as returned by GET /v4/broadcasts. */
export interface KitBroadcast {
  id: number;
  subject: string | null;
  preview_text: string | null;
  description: string | null;
  content: string | null;
  public: boolean;
  status: string | null;
  published_at: string | null;
  send_at: string | null;
  created_at: string;
  public_url: string | null;
  email_address: string | null;
}

/** Stats from GET /v4/broadcasts/{id}/stats (rates are percentages, e.g. 82.93). */
export interface KitBroadcastStats {
  recipients: number;
  open_rate: number;
  emails_opened: number;
  click_rate: number;
  unsubscribe_rate: number;
  unsubscribes: number;
  total_clicks: number;
  status: string;
  open_tracking_disabled: boolean;
  click_tracking_disabled: boolean;
}

/** A broadcast joined with its stats, plus a derived success score. */
export interface Campaign {
  id: number;
  subject: string;
  sendAt: string | null;
  /** Plain-text body (HTML stripped) for analysis + word count. */
  text: string;
  contentHtml: string;
  stats: KitBroadcastStats;
  /** Optional revenue, if purchase data is available for the account. */
  revenue?: number;
  purchases?: number;
  /** Score on the visitor's chosen goal; higher is better. */
  score: number;
}

/** Per-campaign features extracted by the first AI call. */
export interface CampaignFeatures {
  campaign_id: string;
  subject: string;
  summary: string;
  topic: string;
  primary_cta: string;
  cta_count: number;
  link_count: number;
  word_count: number;
  subject_style: string;
  email_style: string;
  tone: string;
  offer_type: string;
  story_present: boolean;
  notes: string;
}

export interface Account {
  id: number;
  name: string;
  plan_type: string;
}

export type Confidence = "High" | "Medium" | "Low";

export interface ReportSignal {
  name: string;
  /** Specific campaign evidence — must cite the actual data. */
  evidence: string[];
  why_it_matters: string;
  related_principle: string;
  recommended_experiment: string;
  confidence: Confidence;
  confidence_reason: string;
}

export interface Experiment {
  experiment: string;
  why: string;
  how_to_measure: string;
  success_looks_like: string;
}

/** The narrative report from the second AI call (numbers come from our data). */
export interface ReportData {
  executive_summary: string[];
  success_goal: string;
  signals: ReportSignal[];
  what_to_repeat: string[];
  what_to_stop: string[];
  experiments: Experiment[];
  data_limitations: string[];
}

/** Everything the results page needs. */
export interface AnalysisResult {
  account: { name: string };
  goal: Goal;
  scoreMethod: string;
  campaigns: Campaign[];
  features: CampaignFeatures[];
  top: Campaign[];
  bottom: Campaign[];
  report: ReportData;
  lowConfidence: boolean;
  revenueAvailable: boolean;
}
