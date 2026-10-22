"use client";
import { useRouter } from "next/navigation";
import type { ReactNode, MouseEvent } from "react";
/** The visible name link remains the keyboard-accessible primary action. */
export function DrilldownRow({
  href,
  children,
  expanded = false,
  scroll = true,
}: {
  href: string;
  children: ReactNode;
  expanded?: boolean;
  scroll?: boolean;
}) {
  const router = useRouter();
  const open = (event: MouseEvent<HTMLTableRowElement>) => {
    if (
      event.button ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      (event.target as HTMLElement).closest("a,button,input,select") ||
      window.getSelection()?.toString()
    )
      return;
    router.push(href, { scroll });
  };
  return (
    <tr
      className={`erp-drill-row${expanded ? " is-expanded" : ""}`}
      onClick={open}
    >
      {children}
    </tr>
  );
}
