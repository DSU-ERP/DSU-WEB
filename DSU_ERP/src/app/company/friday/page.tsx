import { companySession } from "@/features/company/lib/server";
import { CompanyFriday } from "@/features/company/components/CompanyFriday";

export default async function CompanyFridayPage() {
  const session = await companySession();
  return <CompanyFriday company={session.company.name} />;
}
