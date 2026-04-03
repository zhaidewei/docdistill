import { useLang, t } from "../lib/i18n";

const items = [
  { id: "cards", href: "/cards", icon: "📚", labelKey: "nav.cards" as const },
  { id: "graph", href: "/graph", icon: "🗺️", labelKey: "nav.graph" as const },
  { id: "notes", href: "/notes", icon: "📝", labelKey: "nav.notes" as const },
];

export default function MobileNav({ activePage }: { activePage: string }) {
  const [lang] = useLang();
  return (
    <nav class="fixed bottom-0 left-0 right-0 z-50 flex border-t border-surface-border bg-surface-raised md:hidden">
      {items.map((item) => (
        <a
          key={item.id}
          href={item.href}
          class={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs transition-colors ${
            activePage === item.id
              ? "text-accent-orange"
              : "text-slate hover:text-charcoal"
          }`}
        >
          <span class="text-lg leading-none">{item.icon}</span>
          <span>{t(item.labelKey, lang)}</span>
        </a>
      ))}
    </nav>
  );
}
