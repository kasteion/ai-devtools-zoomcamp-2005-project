const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5175";

const request = async (path, options = {}) => {
  const { headers = {}, ...rest } = options;
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    ...rest,
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

export const fetchUserStats = ({ userId, token }) =>
  request(`/api/users/${userId}/stats`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

export const createUserStats = ({ userId, token, stats }) =>
  request(`/api/users/${userId}/stats`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(stats),
  });

export const updateUserStats = ({ userId, token, stats }) =>
  request(`/api/users/${userId}/stats`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(stats),
  });

export const fetchLeaderboard = ({ token, limit = 10 }) =>
  request(`/api/leaderboard?limit=${limit}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
