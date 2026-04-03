import {
  exportToMarkdown,
  getAllAnnotations,
  getAnnotation,
  saveAnnotation,
} from "./annotations";

describe("annotations", () => {
  it("returns an empty annotation when a card has no saved data", () => {
    expect(getAnnotation("missing")).toEqual({
      starred: false,
      comments: [],
      questions: [],
      reported: false,
    });
  });

  it("saves and reads annotations by card id", () => {
    const annotation = {
      starred: true,
      comments: ["important note"],
      questions: ["why does this matter?"],
      reported: false,
    };

    saveAnnotation("card-1", annotation);

    expect(getAnnotation("card-1")).toEqual(annotation);
    expect(getAllAnnotations()).toEqual({
      "card-1": annotation,
    });
  });

  it("exports only matching annotations for the selected tab", () => {
    const cards = [
      { id: "card-1", title: "First card" },
      { id: "card-2", title: "Second card" },
    ];
    const annotations = {
      "card-1": {
        starred: true,
        comments: ["comment a"],
        questions: [],
        reported: false,
      },
      "card-2": {
        starred: false,
        comments: [],
        questions: ["question b"],
        reported: false,
      },
    };

    expect(exportToMarkdown(cards, annotations, "starred")).toContain(
      "## 我的收藏（1 条）"
    );
    expect(exportToMarkdown(cards, annotations, "starred")).toContain(
      "### First card"
    );
    expect(exportToMarkdown(cards, annotations, "comments")).toContain(
      "- comment a"
    );
    expect(exportToMarkdown(cards, annotations, "questions")).toContain(
      "- question b"
    );
    expect(exportToMarkdown(cards, annotations, "comments")).not.toContain(
      "### Second card"
    );
  });

  it("saves and reads the reported flag", () => {
    const annotation = {
      starred: false,
      comments: [],
      questions: [],
      reported: true,
    };
    saveAnnotation("card-reported", annotation);
    expect(getAnnotation("card-reported").reported).toBe(true);
  });
});
