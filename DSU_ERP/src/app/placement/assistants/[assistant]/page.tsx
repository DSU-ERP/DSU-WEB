import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/lib/placement/server";
import { diagnostics } from "@/lib/placement/assistant";
import { AssistantChat } from "@/components/placement/AssistantChat";
import { FridayChat } from "@/components/placement/FridayChat";
import { fridayCapabilities } from "@/lib/friday/config";
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
  if (assistant === "friday")
    return (
      <>
        <Link href="/placement/overview">← Placement overview</Link>
        <header className="po-heading">
          <div>
            <p className="erp-eyebrow">CAMPUS ASSISTANT</p>
            <h1>F.R.I.D.A.Y.</h1>
            <p className="po-note">
              Ask about batches, students, eligibility, drives and placement
              statistics by typing or speaking. Answers are grounded in recorded
              campus data and name the records they came from.
            </p>
          </div>
        </header>
        <FridayChat
          initialHistory={history.rows}
          initialCapabilities={fridayCapabilities()}
        />
      </>
    );

  return (
    <>
      <Link href="/placement/overview">← Placement overview</Link>
      <header className="po-heading">
        <div>
          <p className="erp-eyebrow">CAMPUS ASSISTANT</p>
          <h1>Observation Haki</h1>
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
