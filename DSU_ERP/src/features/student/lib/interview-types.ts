export type InterviewConfig = {
  durationMinutes: number;
  language: string;
  tone: string;
  depth: string;
  questionCount: number;
  company?: string;
  role?: string;
  keywords?: string[];
  preferredMode?: "mock" | "proctored";
  channels?: { text: boolean; voice: boolean; video: boolean };
};
// The report's headline scores, read by the dashboard and readiness views.
export type Scores = {
  overall: number;
  communication: number;
  confidence: number;
  accuracy: number;
};
// Every rubric dimension the AI scores. Feedback saved before the fuller
// rubric only has the four headline keys, so the extra ones are optional.
export type Dimension =
  | "relevance"
  | "clarity"
  | "confidence"
  | "structure"
  | "specificity"
  | "roleFit"
  | "communication"
  | "depth"
  | "conciseness"
  | "accuracy"
  | "overall";
export type DimensionScores = Scores & Partial<Record<Dimension, number>>;
export type TurnJudgement = {
  kind: "answer" | "partial" | "off-topic" | "clarification" | "non-answer";
  scored: boolean;
  reason: string;
};
export type StarAnalysis = {
  applicable: boolean;
  situation: boolean;
  task: boolean;
  action: boolean;
  result: boolean;
  missing: string[];
  score: number | null;
  feedback: string | null;
};
export type AnswerFeedback = {
  scores: DimensionScores;
  quality: string;
  explanation: string;
  strengths: string[];
  improvements: string[];
  followUp: string | null;
  turn?: TurnJudgement;
  star?: StarAnalysis;
};
export type Coaching = {
  title: string;
  explanation: string;
  points: string[];
  rewrite: string | null;
  why: string;
  nextTip: string;
  generatedAt?: string;
  cached?: boolean;
};
export type InterviewAnswer = {
  id: string;
  question?: string;
  focus?: string;
  question_index: number;
  answer: string;
  feedback: Partial<AnswerFeedback>;
  original_answer: string | null;
  original_feedback: Partial<AnswerFeedback> | null;
  retried: boolean;
  coaching?: Record<string, Coaching>;
};
export type InterviewRedirect = { category: string; message: string };
export type AnswerResult = {
  saved: boolean;
  feedback: AnswerFeedback | null;
  redirect: InterviewRedirect | null;
  redirectsRemaining?: number;
  followUp: { questionIndex: number } | null;
};
export type InterviewReport = {
  scores: { [K in keyof Scores]: number | null };
  dimensions?: Partial<Record<Dimension, number | null>>;
  qualities?: Record<string, number>;
  answered: number;
  graded: number;
  unscored?: number;
  pending: number;
  star?: {
    answers: number;
    complete: number;
    elements: Record<"situation" | "task" | "action" | "result", number>;
    score: number | null;
  } | null;
  strengths: string[];
  improvements: string[];
  nextPlan: string[];
  basis: string;
};
// The AI's reading of the plan's documents. Empty for manual plans.
export type PlanContext = {
  jdSummary?: string;
  responsibilities?: string[];
  mustHaveSkills?: string[];
  resumeSummary?: string;
  strengths?: string[];
  risks?: string[];
  objective?: string;
  sections?: { name: string; description: string; questionCount: number }[];
  sources?: { jd: boolean; resume: boolean };
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
  context?: PlanContext;
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
  currentFocus?: string | null;
  currentIsFollowUp?: boolean;
  currentParent?: number | null;
  // Main-question number shown to the student (a follow-up has its parent's)
  // and the number of planned main questions; follow-ups are not counted.
  currentNumber?: number | null;
  plannedCount?: number;
  questionCount: number;
  answeredCount: number;
  answers?: InterviewAnswer[];
  report: InterviewReport | null;
  questions?: { question: string; focus: string; parent?: number | null }[];
  integrity: {
    kind: string;
    detail: string;
    at: string;
    severity?: "warning" | "info";
  }[];
  termination_reason: string | null;
};
