import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import AuthScreen from "./index.jsx";

const setup = (overrides = {}) => {
  const onSignIn = vi.fn();
  const onSignUp = vi.fn();
  const setMode = vi.fn();

  render(
    <AuthScreen
      mode="signin"
      setMode={setMode}
      onSignIn={onSignIn}
      onSignUp={onSignUp}
      loading={false}
      error={null}
      {...overrides}
    />,
  );

  return { onSignIn, onSignUp, setMode };
};

describe("AuthScreen", () => {
  it("submits sign in with identifier and password", async () => {
    const user = userEvent.setup();
    const { onSignIn } = setup();

    await user.type(
      screen.getByPlaceholderText(/email or username/i),
      "captain@fleet.io",
    );
    await user.type(screen.getByPlaceholderText(/password/i), "secret");

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(onSignIn).toHaveBeenCalledWith({
      identifier: "captain@fleet.io",
      password: "secret",
    });
  });

  it("submits sign up with username, email, and password", async () => {
    const user = userEvent.setup();
    const { onSignUp } = setup({ mode: "signup" });

    await user.type(screen.getByPlaceholderText(/username/i), "Admiral");
    await user.type(screen.getByPlaceholderText(/email/i), "lead@fleet.io");
    await user.type(screen.getByPlaceholderText(/password/i), "secret");

    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(onSignUp).toHaveBeenCalledWith({
      username: "Admiral",
      email: "lead@fleet.io",
      password: "secret",
    });
  });

  it("toggles mode when clicking the switch button", async () => {
    const user = userEvent.setup();
    const { setMode } = setup({ mode: "signin" });

    await user.click(screen.getByRole("button", { name: /create account/i }));

    expect(setMode).toHaveBeenCalledWith("signup");
  });
});
