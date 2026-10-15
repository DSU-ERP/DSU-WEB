import Link from "next/link";
import { notFound } from "next/navigation";
import { officerSession, placementRead } from "@/lib/placement/server";
import { diagnostics } from "@/lib/placement/assistant";
import { AssistantChat } from "@/components/placement/AssistantChat";
import { FridayChat } from "@/components/placement/FridayChat";
import { fridayCapabilities } from "@/lib/friday/config";
import { focusBatch } from "@/lib/friday/view";
import type { Report } from "@/lib/placement/types";
import "../../friday.css";
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
    // The assistant draws its own header bar, so the page adds nothing around
    // it. The focus batch is decided here, on the server, so the starter
    // prompts render identically on the server and in the browser.
    return (
      <FridayChat
        initialHistory={history.rows}
        initialCapabilities={fridayCapabilities()}
        focusBatch={focusBatch(history.options?.batches ?? [], new Date().getFullYear())}
      />
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
