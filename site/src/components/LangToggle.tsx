import { useLang } from "../lib/i18n";

export default function LangToggle() {
  const [lang, setLang] = useLang();

  return (
    <button
      onClick={() => setLang(lang === "zh" ? "en" : "zh")}
      class="px-2 py-1 rounded text-xs bg-surface-raised text-gray-400 hover:text-gray-200 transition-colors"
    >
      {lang === "zh" ? "EN" : "中"}
    </button>
  );
}
