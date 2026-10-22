import { Check } from "lucide-react";
export function InterviewJourney({ current }: { current: number }) {
  return <ol className="iw-journey" aria-label="Your interview journey">{["Review your plan", "Check your setup", "Have the conversation", "Reflect & improve"].map((label, index) => <li key={label} aria-current={current === index ? "step" : undefined} data-done={index < current}><span>{index < current ? <Check size={12} /> : index + 1}</span><strong>{label}</strong></li>)}</ol>;
}
