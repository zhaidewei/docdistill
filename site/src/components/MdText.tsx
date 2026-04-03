import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

const ALLOWED_TAGS = new Set([
  "p", "br", "strong", "em", "code", "pre", "ul", "ol", "li",
  "table", "thead", "tbody", "tr", "th", "td",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "blockquote", "hr", "a", "img", "div", "span",
]);

function escapeUnknownTags(html: string): string {
  return html.replace(/<(\/?[a-zA-Z][a-zA-Z0-9-]*)([^>]*)>/g, (match, tag) => {
    if (ALLOWED_TAGS.has(tag.replace(/^\//, "").toLowerCase())) return match;
    return match.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  });
}

export default function MdText({ text, class: cls }: { text: string; class?: string }) {
  const html = escapeUnknownTags(marked.parse(text) as string);
  return (
    <div
      class={`md-prose ${cls ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
