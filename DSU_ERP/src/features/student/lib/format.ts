// A deliberately small formatter for assistant replies. It understands
// headings, numbered and bulleted lists and **bold** text, and returns plain
// data that is rendered as React text nodes: model output is never parsed as
// HTML, so markup or script in a reply is shown as text.

export type Inline = { text: string; bold: boolean; code?: boolean; italic?: boolean; href?: string };
export type Block =
  | { kind: "heading"; level: 1 | 2; inline: Inline[] }
  | { kind: "paragraph"; lines: Inline[][] }
  | { kind: "code"; language: string; text: string }
  | { kind: "quote"; lines: Inline[][] }
  | { kind: "divider" }
  | { kind: "list"; ordered: boolean; start: number; items: Inline[][] };

const INLINE = /`([^`\n]+)`|\*\*(?=\S)([^*\n]*?\S)\*\*|\[([^\]\n]+)\]\(([^\s)]+)\)|\*(?=\S)([^*\n]*?\S)\*/g;

export function parseInline(text: string): Inline[] {
  const parts: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) parts.push({ text: text.slice(last, index), bold: false });
    if (match[1]) parts.push({ text: match[1], bold: false, code: true });
    else if (match[2]) parts.push({ text: match[2], bold: true });
    else if (match[3]) {
      // Only absolute HTTP(S) links become anchors. Everything else stays text.
      let href: string | undefined;
      try { const url = new URL(match[4]); if (/^https?:$/.test(url.protocol)) href = url.href; } catch { /* Plain label below. */ }
      parts.push({ text: match[3], bold: false, ...(href ? { href } : {}) });
    } else parts.push({ text: match[5], bold: false, italic: true });
    last = index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last), bold: false });
  return parts;
}

type ListDraft = { ordered: boolean; start: number; items: string[] };

export function formatMessage(source: string): Block[] {
  const blocks: Block[] = [];
  // Held in an object so the helpers below can reset it without narrowing issues.
  const open: { paragraph: string[]; list: ListDraft | null } = { paragraph: [], list: null };
  const flushParagraph = () => {
    if (open.paragraph.length) blocks.push({ kind: "paragraph", lines: open.paragraph.map(parseInline) });
    open.paragraph = [];
  };
  const flushList = () => {
    const list = open.list;
    if (list) blocks.push({ kind: "list", ordered: list.ordered, start: list.start, items: list.items.map(parseInline) });
    open.list = null;
  };
  let fence: { marker: string; language: string; lines: string[] } | null = null;
  const flushCode = () => {
    if (fence) blocks.push({ kind: "code", language: fence.language, text: fence.lines.join("\n") });
    fence = null;
  };
  const lines = String(source ?? "").replace(/\r\n?/g, "\n").split("\n");
  for (let cursor = 0; cursor < lines.length; cursor++) {
    let line = lines[cursor];
    const text = line.trim();
    if (fence) {
      if (text.startsWith(fence.marker) && !text.slice(fence.marker.length).trim()) flushCode();
      else fence.lines.push(line);
      continue;
    }
    const code = /^(`{3,}|~{3,})([\w+-]*)\s*$/.exec(text);
    if (code) {
      flushParagraph(); flushList();
      fence = { marker: code[1], language: code[2], lines: [] };
      continue;
    }
    // Older replies sometimes packed explicit Markdown markers onto one line.
    // Recover only clear section/list boundaries; never split ordinary prose,
    // decimal values, or fenced code into invented sections.
    const embeddedHeading = /^(.*?\S)[ \t]+(#{2,6}[ \t]+.+)$/.exec(line);
    if (embeddedHeading && !/^#{1,6}\s/.test(line.trim())) {
      lines.splice(cursor + 1, 0, embeddedHeading[2]);
      line = embeddedHeading[1];
    }
    const packedHeading = /^(#{1,6}\s+.+?)\s+(1[.)]\s+.+\s+2[.)]\s+.+)$/.exec(line.trim());
    if (packedHeading) {
      lines.splice(cursor + 1, 0, packedHeading[2]);
      line = packedHeading[1];
    }
    const numberedStart = /^\s*(\d{1,3})[.)]\s+/.exec(line);
    if (numberedStart) {
      const boundary = new RegExp(`\\s+${Number(numberedStart[1]) + 1}[.)]\\s+`).exec(line);
      if (boundary?.index !== undefined) {
        lines.splice(cursor + 1, 0, line.slice(boundary.index).trim());
        line = line.slice(0, boundary.index);
      }
    }
    const value = line.trim();
    if (!value) {
      flushParagraph();
      flushList();
      continue;
    }
    if (/^(?:-{3,}|\*{3,}|_{3,})$/.test(value)) {
      flushParagraph(); flushList(); blocks.push({ kind: "divider" }); continue;
    }
    const quote = /^>\s?(.*)$/.exec(value);
    if (quote) {
      flushParagraph(); flushList();
      const previous = blocks.at(-1);
      if (previous?.kind === "quote") previous.lines.push(parseInline(quote[1]));
      else blocks.push({ kind: "quote", lines: [parseInline(quote[1])] });
      continue;
    }
    // Closing hashes need a space before them, so "## Skills for C#" keeps its "#".
    const heading = /^(#{1,6})\s+(.+?)(?:\s+#+)?$/.exec(value);
    if (heading) {
      flushParagraph();
      flushList();
      blocks.push({ kind: "heading", level: heading[1].length <= 2 ? 1 : 2, inline: parseInline(heading[2]) });
      continue;
    }
    const numbered = /^(\d{1,3})[.)]\s+(.+)$/.exec(value);
    const bullet = numbered ? null : /^[-*•]\s+(.+)$/.exec(value);
    const item = numbered?.[2] ?? bullet?.[1];
    if (item !== undefined) {
      flushParagraph();
      const ordered = !!numbered;
      if (!open.list || open.list.ordered !== ordered) {
        flushList();
        open.list = { ordered, start: numbered ? Number(numbered[1]) : 1, items: [] };
      }
      open.list.items.push(item.trim());
      continue;
    }
    if (open.list && /^\s/.test(line)) {
      // An indented line continues the previous list item.
      open.list.items[open.list.items.length - 1] += " " + value;
      continue;
    }
    flushList();
    open.paragraph.push(value);
  }
  flushParagraph();
  flushList();
  flushCode();
  return blocks;
}
