import Link from "next/link";
import { FileUp, Route } from "lucide-react";
import { PageTitle } from "@/features/student/components/UI";
export default function Page() {
  return (
    <>
      <PageTitle
        title="Your experience. A clearer direction."
        description="Give your experience context, then turn it into a practical career plan."
      />
      <div className="st-grid st-career-hub">
        <Link className="st-link-card" href="/student/resume/intake">
          <FileUp size={30} />
          <h2>Start with your story.</h2>
          <p>
            Upload or paste your resume. Add the role you’re working toward.
          </p>
          <span>Open resume intake ↗</span>
        </Link>
        <Link className="st-link-card" href="/student/resume/prediction">
          <Route size={30} />
          <h2>See what comes next.</h2>
          <p>
            Explore role fit, strengths, risks and an actionable roadmap
            grounded in your experience.
          </p>
          <span>Open career report ↗</span>
        </Link>
      </div>
    </>
  );
}
