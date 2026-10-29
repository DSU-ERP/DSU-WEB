import { officerSession, placementRankingOverview, placementRankings } from "@/features/placement/lib/server";
import { DEFAULT_TOPIC, rankingQuery } from "@/features/placement/lib/ranking";
import {
  RankingFilters,
  RankingHeader,
  RankingSummary,
  RankingTable,
  RankingTabs,
} from "@/features/placement/components/StudentsRanking";

// Students Ranking: stored, versioned scores from the backend. Loading this
// page never calls GitHub or LeetCode and never recalculates a score.
export default async function StudentsRanking({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await officerSession();
  const query = rankingQuery(await searchParams);
  const cohort = { batch: query.batch, department: query.department, semester: query.semester };
  // The topic view needs a topic; default to the first rankable one so both
  // reads can run in parallel (each is a separate round trip to the backend).
  if (query.kind === "topic" && !query.topic) query.topic = DEFAULT_TOPIC;
  const [overview, list] = await Promise.all([placementRankingOverview(cohort), placementRankings(query)]);
  const topicLabel = overview.topics.find((t) => t.code === query.topic)?.label;
  return (
    <>
      <RankingHeader overview={overview} />
      <RankingSummary overview={overview} />
      <RankingTabs query={query} />
      <RankingFilters overview={overview} query={query} />
      <RankingTable data={list} query={query} topicLabel={topicLabel} />
    </>
  );
}
