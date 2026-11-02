import { agentRun, agentRuns, agentWorkflows } from "@/features/admin/lib/server";
import { AgentWorkflow } from "@/features/admin/components/AgentWorkflow";
import type { Assistant } from "@/features/admin/lib/types";

export const metadata = { title: "Agent workflow · Admin" };

export default async function AgentWorkflowPage({ searchParams }: { searchParams: Promise<{ assistant?: string; run?: string }> }) {
  const params = await searchParams;
  const requested = (["student", "officer", "company"] as const).find((a) => a === params.assistant);
  const run = params.run ? await agentRun(params.run).catch(() => null) : null;
  const assistant: Assistant = run?.assistant ?? requested ?? "student";
  const [workflows, runs] = await Promise.all([agentWorkflows(), agentRuns({ assistant, limit: "60" })]);
  return <AgentWorkflow workflows={workflows} initialRuns={runs} initialRun={run} initialAssistant={assistant} />;
}
