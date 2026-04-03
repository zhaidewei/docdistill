import { render, screen } from "@testing-library/preact";
import { describe, it, expect } from "vitest";
import ConceptModelCard from "./ConceptModelCard";

const baseBody = {
  concept: "Test concept",
  analogy: "Test analogy",
};

describe("ConceptModelCard", () => {
  it("renders concept and analogy text", () => {
    render(<ConceptModelCard body={baseBody} lang="en" />);
    expect(screen.getByText("Test concept")).toBeInTheDocument();
    expect(screen.getByText("Test analogy")).toBeInTheDocument();
  });

  it("renders diagram img when cardId is provided", () => {
    render(<ConceptModelCard body={baseBody} lang="en" cardId="my-card-id" />);
    const img = screen.getByRole("img");
    expect(img).toHaveAttribute("src", "/diagrams/my-card-id.svg");
    expect(img).toHaveAttribute("alt", "diagram");
  });

  it("does not render img when cardId is not provided", () => {
    render(<ConceptModelCard body={baseBody} lang="en" />);
    expect(screen.queryByRole("img")).toBeNull();
  });
});
