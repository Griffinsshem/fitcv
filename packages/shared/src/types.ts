import type {
  ApplicationStatus,
  CvTemplate,
  JobAnalysis,
  JobKind,
  JobStatus,
  MatchReport,
  SuggestedSkill,
  TailoredCv,
} from './application';
import type { MasterProfile } from './profile';

/** API response shapes shared by server and client. */

export interface ApiError {
  error: { code: string; message: string; details?: unknown; requestId?: string };
}

export interface MeResponse {
  user: { id: string; email: string; name: string; avatarUrl: string | null; plan: 'FREE' | 'PRO' };
  usage: { aiCallsToday: number; aiDailyLimit: number };
}

export interface ProfileResponse {
  profile: MasterProfile;
  updatedAt: string | null;
}

export interface ApplicationSummary {
  id: string;
  company: string;
  jobTitle: string;
  status: ApplicationStatus;
  matchScore: number | null;
  tailoredScore: number | null;
  hasDocuments: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApplicationDetail extends ApplicationSummary {
  jobUrl: string;
  jobDescription: string;
  notes: string;
  template: CvTemplate;
  analysis: JobAnalysis | null;
  matchReport: MatchReport | null;
  tailoredReport: MatchReport | null;
  tailoredCv: TailoredCv | null;
  coverLetter: string | null;
  suggestedSkills: SuggestedSkill[];
  changeNotes: string[];
  activeJob: JobView | null;
}

export interface JobView {
  id: string;
  kind: JobKind;
  status: JobStatus;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
  /** Only set for IMPORT_CV jobs: a draft profile for the user to review. */
  result?: MasterProfile | null;
}
