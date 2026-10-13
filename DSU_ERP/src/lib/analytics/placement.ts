// Presentation only. Supabase decides eligibility from the precise stored CGPA.
export function placementStatus(eligible: boolean | null | undefined) {
  return eligible === true ? "Eligible" : eligible === false ? "Not Eligible" : "Unclassified";
}

export const QUOTA_COLUMNS = ["DSAT", "CET", "COMEDK", "UNIGAUGE", "DCET", "Mgmt", "Other"] as const;
export function quotaCounts(raw: Record<string, number>) {
  const result = Object.fromEntries(QUOTA_COLUMNS.map(key => [key, 0])) as Record<typeof QUOTA_COLUMNS[number], number>;
  for (const [quota, count] of Object.entries(raw)) {
    const value = quota.trim().toUpperCase();
    const group = value === "DSAT" || value === "DSAT ONLINE" ? "DSAT"
      : ["MGMT", "MANAGEMENT", "MANAGEMENT QUOTA"].includes(value) ? "Mgmt"
      : ["CET", "COMEDK", "UNIGAUGE", "DCET"].includes(value) ? value as "CET" | "COMEDK" | "UNIGAUGE" | "DCET"
      : "Other";
    result[group] += count;
  }
  return result;
}
