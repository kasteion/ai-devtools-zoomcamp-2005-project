import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import App from "./App.jsx";

vi.mock("./services/authApi", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("./services/statsApi", () => ({
  fetchUserStats: vi.fn().mockResolvedValue({ stats: null }),
  updateUserStats: vi.fn(),
  fetchLeaderboard: vi.fn().mockResolvedValue({ leaderboard: [] }),
}));

const { signIn, signUp } = await import("./services/authApi");

describe("App auth", () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  it("signs in and stores auth token", async () => {
    signIn.mockResolvedValue({
      token: "token-123",
      user: { id: "user-1", username: "Captain" },
    });

    const user = userEvent.setup();
    render(<App />);

    await user.type(
      screen.getByPlaceholderText(/email or username/i),
      "captain@fleet.io",
    );
    await user.type(screen.getByPlaceholderText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() =>
      expect(signIn).toHaveBeenCalledWith({
        identifier: "captain@fleet.io",
        password: "secret",
      }),
    );

    await waitFor(() =>
      expect(window.localStorage.getItem("authToken")).toBe("token-123"),
    );
  });

  it("signs up and stores auth token", async () => {
    signUp.mockResolvedValue({
      token: "token-456",
      user: { id: "user-2", username: "Admiral" },
    });

    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /create account/i }));
    await user.type(screen.getByPlaceholderText(/username/i), "Admiral");
    await user.type(screen.getByPlaceholderText(/email/i), "lead@fleet.io");
    await user.type(screen.getByPlaceholderText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    await waitFor(() =>
      expect(signUp).toHaveBeenCalledWith({
        username: "Admiral",
        email: "lead@fleet.io",
        password: "secret",
      }),
    );

    await waitFor(() =>
      expect(window.localStorage.getItem("authToken")).toBe("token-456"),
    );
  });
});
