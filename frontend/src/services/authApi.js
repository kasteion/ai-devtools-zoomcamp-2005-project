const API_BASE_URL = "http://localhost:5175";

const request = async (path, options = {}) => {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
    ...options,
  });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = payload?.error || "REQUEST_FAILED";
    const err = new Error(error);
    err.status = response.status;
    err.payload = payload;
    throw err;
  }

  return payload;
};

export const signUp = ({ username, email, password }) =>
  request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });

export const signIn = ({ identifier, password }) =>
  request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ identifier, password }),
  });
