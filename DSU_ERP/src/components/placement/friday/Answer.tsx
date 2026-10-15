import Link from "next/link";
import { Fragment } from "react";
import { parseAnswer, type Inline } from "@/lib/friday/view";

// Renders the safe Markdown subset parsed in lib/friday/view. Every node is a
// React element built from parsed data, so model output can never inject HTML,
// and only links into /placement/ are ever clickable.

function Inlines({ parts }: { parts: Inline[] }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.kind === "strong") return <strong key={i}>{p.text}</strong>;
        if (p.kind === "code") return <code key={i}>{p.text}</code>;
        if (p.kind === "link")
          return (
            <Link key={i} href={p.href} target="_blank" rel="noopener">
              {p.text}
            </Link>
          );
        return <Fragment key={i}>{p.text}</Fragment>;
      })}
    </>
  );
}

export function Answer({ text }: { text: string }) {
  const blocks = parseAnswer(text);
  return (
    <div className="fr-answer">
      {blocks.map((b, i) => {
        if (b.kind === "heading")
          return (
            <h4 key={i}>
              <Inlines parts={b.inline} />
            </h4>
          );
        if (b.kind === "list") {
          const Tag = b.ordered ? "ol" : "ul";
          return (
            <Tag key={i}>
              {b.items.map((item, j) => (
                <li key={j}>
                  <Inlines parts={item} />
                </li>
              ))}
            </Tag>
          );
        }
        if (b.kind === "table")
          return (
            <div key={i} className="fr-table-wrap" tabIndex={0} role="region" aria-label="Table in answer">
              <table>
                <thead>
                  <tr>
                    {b.head.map((cell, j) => (
                      <th key={j} scope="col" style={b.align[j] ? { textAlign: b.align[j]! } : undefined}>
                        <Inlines parts={cell} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {b.rows.map((row, r) => (
                    <tr key={r}>
                      {row.map((cell, j) => (
                        <td key={j} style={b.align[j] ? { textAlign: b.align[j]! } : undefined}>
                          <Inlines parts={cell} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        return (
          <p key={i}>
            <Inlines parts={b.inline} />
          </p>
        );
      })}
    </div>
  );
}
