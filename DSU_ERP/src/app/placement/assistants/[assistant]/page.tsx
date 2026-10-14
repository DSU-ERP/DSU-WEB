import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/lib/placement/server";
import { diagnostics } from "@/lib/placement/assistant";
import { AssistantChat } from "@/components/placement/AssistantChat";
import type { Report } from "@/lib/placement/types";
export default async function AssistantPage({
  params,
}: {
  params: Promise<{ assistant: string }>;
}) {
  await officerSession();
  const { assistant } = await params;
  if (assistant !== "friday" && assistant !== "observation") notFound();
  const history = await placementRead<Report>("conversations", {
    assistant,
    limit: "100",
  });
  return (
    <>
      <Link href="/placement/overview">← Placement overview</Link>
      <header className="po-heading">
        <div>
          <p className="erp-eyebrow">CAMPUS ASSISTANT</p>
          <h1>
            {assistant === "friday" ? "F.R.I.D.A.Y." : "Observation Haki"}
          </h1>
          <p className="po-note">
            Ask for students, batch summaries, candidates, drives, tests or
            placement reports. Responses use recorded campus data.
          </p>
        </div>
      </header>
      <AssistantChat
        assistant={assistant}
        initialHistory={history.rows}
        batches={history.options.batches}
        initialDiagnostics={diagnostics()}
      />
    </>
  );
}
