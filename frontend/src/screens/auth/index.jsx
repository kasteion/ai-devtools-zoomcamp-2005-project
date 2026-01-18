import { useState } from "react";

const AuthScreen = ({ mode, setMode, onSignIn, onSignUp, loading, error }) => {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const isSignUp = mode === "signup";

  const handleSubmit = (event) => {
    event.preventDefault();
    if (isSignUp) {
      onSignUp({ username, email, password });
      return;
    }
    onSignIn({ identifier, password });
  };

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>{isSignUp ? "Create account" : "Sign in"}</h2>
        <span className="turn-indicator">Step 0</span>
      </div>
      <p className="panel-subtitle">
        {isSignUp
          ? "Create your account to start playing."
          : "Sign in to continue."}
      </p>
      <form className="controls" onSubmit={handleSubmit}>
        {isSignUp ? (
          <>
            <input
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
              required
            />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              required
            />
          </>
        ) : (
          <input
            type="text"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
            placeholder="Email or username"
            required
          />
        )}
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Password"
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? "Working..." : isSignUp ? "Sign up" : "Sign in"}
        </button>
      </form>
      {error && <p className="auth-error">{error}</p>}
      <div className="auth-toggle">
        <span>{isSignUp ? "Already have an account?" : "New here?"}</span>
        <button
          type="button"
          onClick={() => setMode(isSignUp ? "signin" : "signup")}
        >
          {isSignUp ? "Sign in" : "Create account"}
        </button>
      </div>
    </section>
  );
};

export default AuthScreen;
