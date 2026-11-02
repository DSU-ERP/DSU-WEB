import Link from "next/link";
import { RequestForm } from "@/features/company/components/RequestForm";

export default function NewDriveRequestPage() {
  return (
    <>
      <Link className="erp-back" href="/company/drives">
        ← Drives
      </Link>
      <h1>Submit a campus drive</h1>
      <p className="erp-muted cp-lede">
        Start with your job description PDF if you have one. You can save a draft at any time. The placement office reviews the drive before
        any student sees it.
      </p>
      <RequestForm request={null} />
    </>
  );
}
