import { marked } from "marked";

marked.setOptions({ gfm: true, breaks: false });

export default function MdText({ text, class: cls }: { text: string; class?: string }) {
  const html = marked.parse(text) as string;
  return (
    <div
      class={`md-prose ${cls ?? ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
