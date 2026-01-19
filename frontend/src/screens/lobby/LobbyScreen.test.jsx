import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import LobbyScreen from "./index.jsx";

describe("LobbyScreen", () => {
  it("renders lobby header and empty state", () => {
    render(
      <LobbyScreen
        handleCreateRoom={vi.fn()}
        handleJoinRoom={vi.fn()}
        availableRooms={[]}
      />,
    );

    expect(screen.getByRole("heading", { name: /room lobby/i })).toBeVisible();
    expect(screen.getByText(/no rooms available yet/i)).toBeInTheDocument();
  });

  it("calls handleJoinRoom when clicking join", async () => {
    const user = userEvent.setup();
    const handleJoinRoom = vi.fn();

    render(
      <LobbyScreen
        handleCreateRoom={vi.fn()}
        handleJoinRoom={handleJoinRoom}
        availableRooms={[
          { roomId: "ROOM-1", players: [{}, {}], phase: "waiting" },
        ]}
      />,
    );

    await user.click(screen.getByRole("button", { name: /join/i }));

    expect(handleJoinRoom).toHaveBeenCalledWith("ROOM-1");
  });
});
