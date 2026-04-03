import { fireEvent, render, screen } from "@testing-library/preact";
import LangToggle from "./LangToggle";

describe("LangToggle", () => {
  it("shows EN when the current language is zh", () => {
    render(<LangToggle />);

    expect(screen.getByRole("button")).toHaveTextContent("EN");
  });

  it("toggles language and persists the new value", () => {
    render(<LangToggle />);

    fireEvent.click(screen.getByRole("button"));

    expect(localStorage.getItem("lang")).toBe("en");
    expect(screen.getByRole("button")).toHaveTextContent("中");
  });
});
