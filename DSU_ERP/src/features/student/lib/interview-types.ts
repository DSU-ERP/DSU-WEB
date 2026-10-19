export type InterviewConfig = {
  durationMinutes: number;
  language: string;
  tone: string;
  depth: string;
  questionCount: number;
  company?: string;
  role?: string;
  keywords?: string[];
};
export type Scores = {
  overall: number;
  communication: number;
  confidence: number;
  accuracy: number;
};
export type AnswerFeedback = {
  scores: Scores;
  quality: string;
  explanation: string;
  strengths: string[];
  improvements: string[];
  followUp: string | null;
};
export type InterviewAnswer = {
  id: string;
  question?: string;
  question_index: number;
  answer: string;
  feedback: Partial<AnswerFeedback>;
  original_answer: string | null;
  original_feedback: Partial<AnswerFeedback> | null;
  retried: boolean;
};
export type InterviewReport = {
  scores: { [K in keyof Scores]: number | null };
  answered: number;
  graded: number;
  pending: number;
  strengths: string[];
  improvements: string[];
  nextPlan: string[];
  basis: string;
};
export type InterviewPlan = {
  id: string;
  title: string;
  goal: string;
  config: InterviewConfig;
  created_at: string;
  questions: number;
  sessions: number;
  seconds: number;
  archived: boolean;
};
export type InterviewPlanDetail = Omit<
  InterviewPlan,
  "questions" | "sessions"
> & {
  jd: string;
  resume_context: string;
  questions: { focus: string }[];
  sessions: {
    id: string;
    mode: string;
    status: string;
    started_at: string;
    ended_at: string | null;
    report: InterviewReport | null;
  }[];
};
export type InterviewStats = {
  answers: number;
  statuses: { status: string; total: number }[];
  focus: { label: string; total: number }[];
  answerDays: { activity_date: string; answers: number }[];
  plans: { plans: number; questions: number };
  sessions: { total: number; completed: number; seconds: number };
  daily: { activity_date: string; sessions: number; seconds: number }[];
  recent: {
    id: string;
    title: string;
    status: string;
    mode: string;
    started_at: string;
    ended_at: string | null;
    report: InterviewReport | null;
  }[];
};
export type InterviewSession = {
  id: string;
  interview_id: string;
  title: string;
  mode: "mock" | "proctored";
  status: "active" | "completed" | "terminated";
  started_at: string;
  expires_at: string;
  ended_at: string | null;
  config: InterviewConfig;
  currentIndex: number;
  currentQuestion: string | null;
  questionCount: number;
  answeredCount: number;
  answers?: InterviewAnswer[];
  report: InterviewReport | null;
  questions?: { question: string; focus: string }[];
  integrity: { kind: string; detail: string; at: string }[];
  termination_reason: string | null;
};
