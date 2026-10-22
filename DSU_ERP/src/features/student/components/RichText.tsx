import { Fragment, type ReactNode } from "react";
import { formatMessage, type Inline } from "../lib/format";

function Line({ parts, reveal }: { parts: Inline[]; reveal?: (text: string) => ReactNode }) {
  return (
    <>
      {parts.map((part, index) => {
        const content = reveal ? reveal(part.text) : part.text;
        return part.code ? <code key={index}>{content}</code> :
          part.href ? <a key={index} href={part.href} target="_blank" rel="noopener noreferrer nofollow">{content}</a> :
          part.bold ? <strong key={index}>{content}</strong> :
          part.italic ? <em key={index}>{content}</em> : <Fragment key={index}>{content}</Fragment>;
      })}
    </>
  );
}

/** Renders an assistant reply as headings, lists and paragraphs (text nodes only). */
export function RichText({ text, animate = false }: { text: string; animate?: boolean }) {
  // Animate short phrases from the already validated answer. Keep the complete
  // semantic text available to selection, copy and assistive technology, and
  // avoid timers, repeated parsing or an artificial typewriter delay.
  let phrase = 0;
  const reveal = animate ? (value: string) => (value.match(/(?:\S+\s*){1,3}|\s+/g) || []).map((chunk, index) => <span className="hk-answer-phrase" key={index} style={{ animationDelay: `${Math.min(phrase++ * 22, 600)}ms` }}>{chunk}</span>) : undefined;
  return (
    <div className="st-rich">
      {formatMessage(text).map((block, index) => {
        if (block.kind === "code") return <div className="hk-code-block" key={index}><div>{block.language || "Code"}</div><pre tabIndex={0} aria-label={`${block.language || "Code"} example`}><code>{block.text}</code></pre></div>;
        if (block.kind === "divider") return <hr key={index} />;
        if (block.kind === "quote") return <blockquote key={index}>{block.lines.map((line, i) => <p key={i}><Line parts={line} reveal={reveal} /></p>)}</blockquote>;
        if (block.kind === "heading")
          return block.level === 1 ? (
            <h3 key={index}>
              <Line parts={block.inline} reveal={reveal} />
            </h3>
          ) : (
            <h4 key={index}>
              <Line parts={block.inline} reveal={reveal} />
            </h4>
          );
        if (block.kind === "list") {
          const items = block.items.map((item, i) => (
            <li key={i}>
              <Line parts={item} reveal={reveal} />
            </li>
          ));
          return block.ordered ? (
            <ol key={index} start={block.start}>
              {items}
            </ol>
          ) : (
            <ul key={index}>{items}</ul>
          );
        }
        return (
          <p key={index}>
            {block.lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                <Line parts={line} reveal={reveal} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
