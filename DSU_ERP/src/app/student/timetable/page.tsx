import { backendApi } from "@/shared/http/backend";
import {
  Timetable,
  type CalendarEvent,
} from "@/features/student/components/Timetable";
import { weekStart } from "@/features/student/lib/calendar";
export default async function Page() {
  const from = weekStart(),
    to = new Date(from.getTime() + 7 * 86400000);
  return (
    <Timetable
      initial={
        (
          await backendApi<{ data: CalendarEvent[] }>(
            "/student/calendar?" +
              new URLSearchParams({
                from: from.toISOString(),
                to: to.toISOString(),
              }),
          )
        ).data
      }
    />
  );
}
