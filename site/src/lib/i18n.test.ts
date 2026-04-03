import { cardBody, cardTitle, getLang, setLang, t } from "./i18n";
import type { Card } from "./types";

const card: Card = {
  id: "card-1",
  type: "fact",
  title: "中文标题",
  title_en: "English Title",
  source: "source",
  tags: ["tag"],
  readingMinutes: 3,
  body: {
    fact: "中文事实",
    context: "中文背景",
  },
  body_en: {
    fact: "English fact",
    context: "English context",
  },
};

describe("i18n", () => {
  it("defaults to zh when localStorage is empty", () => {
    expect(getLang()).toBe("zh");
  });

  it("persists language changes in localStorage", () => {
    setLang("en");

    expect(getLang()).toBe("en");
    expect(localStorage.getItem("lang")).toBe("en");
  });

  it("returns localized strings with zh fallback", () => {
    expect(t("nav.cards", "en")).toBe("Cards");
    expect(t("nav.cards", "zh")).toBe("卡片");
  });

  it("uses translated card fields when english content exists", () => {
    expect(cardTitle(card, "en")).toBe("English Title");
    expect(cardTitle(card, "zh")).toBe("中文标题");
    expect(cardBody(card, "en")).toEqual(card.body_en);
    expect(cardBody(card, "zh")).toEqual(card.body);
  });

  it("falls back to zh card fields when english content is missing", () => {
    const zhOnlyCard: Card = {
      ...card,
      title_en: undefined,
      body_en: undefined,
    };

    expect(cardTitle(zhOnlyCard, "en")).toBe("中文标题");
    expect(cardBody(zhOnlyCard, "en")).toEqual(card.body);
  });
});
