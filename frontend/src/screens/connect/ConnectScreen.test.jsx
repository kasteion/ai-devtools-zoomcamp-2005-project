import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import ConnectScreen from "./index.jsx";

describe("ConnectScreen", () => {
  it("updates the player name as the user types", async () => {
    const user = userEvent.setup();
    const setPlayerName = vi.fn();

    render(
      <ConnectScreen
        playerName=""
        setPlayerName={setPlayerName}
        handleConnect={vi.fn()}
      />,
    );

    await user.type(screen.getByPlaceholderText(/player name/i), "A");

    expect(setPlayerName).toHaveBeenCalled();
    expect(setPlayerName).toHaveBeenLastCalledWith("A");
  });

  it("calls handleConnect when clicking connect", async () => {
    const user = userEvent.setup();
    const handleConnect = vi.fn();

    render(
      <ConnectScreen
        playerName="Captain"
        setPlayerName={vi.fn()}
        handleConnect={handleConnect}
      />,
    );

    await user.click(screen.getByRole("button", { name: /connect/i }));

    expect(handleConnect).toHaveBeenCalledTimes(1);
  });
});
