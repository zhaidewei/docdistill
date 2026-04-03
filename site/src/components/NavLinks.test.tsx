import { render, screen } from "@testing-library/preact";
import NavLinks from "./NavLinks";

describe("NavLinks", () => {
  it("renders localized navigation labels", () => {
    localStorage.setItem("lang", "en");

    render(<NavLinks activePage="cards" />);

    expect(screen.getByRole("link", { name: "Cards" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Graph" })).toBeInTheDocument();
  });

  it("marks the active link with the active style", () => {
    render(<NavLinks activePage="graph" />);

    expect(screen.getByRole("link", { name: "图谱" }).className).toContain(
      "bg-surface-muted"
    );
    expect(screen.getByRole("link", { name: "卡片" }).className).not.toContain(
      "bg-surface-muted"
    );
  });
});
