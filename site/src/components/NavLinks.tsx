import { useLang, t } from "../lib/i18n";

export default function NavLinks({ activePage }: { activePage: string }) {
  const [lang] = useLang();
  const items = [
    { id: "cards", href: "/cards", key: "nav.cards" as const },
    { id: "graph", href: "/graph", key: "nav.graph" as const },
    { id: "swipe", href: "/swipe", key: "nav.swipe" as const },
    { id: "starred", href: "/starred", key: "nav.starred" as const },
    { id: "reported", href: "/reported", key: "nav.reported" as const },
  ];

  return (
    <div class="flex gap-1">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href}
          class={`px-3 py-1.5 rounded text-sm transition-colors ${
            activePage === item.id
              ? "bg-surface-muted text-charcoal"
              : "text-slate hover:text-charcoal"
          }`}
        >
          {t(item.key, lang)}
        </a>
      ))}
    </div>
  );
}
