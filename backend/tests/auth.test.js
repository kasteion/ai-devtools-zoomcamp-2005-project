const request = require("supertest");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");

let mongoServer;

const createApp = async () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
  mongoServer = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongoServer.getUri();
  process.env.MONGO_DB_NAME = "jest";

  const { app } = require("../src/server");
  await mongoose.connect(process.env.MONGO_URI, {
    dbName: process.env.MONGO_DB_NAME,
  });
  return app;
};

const registerUser = async (app, { username, email, password }) => {
  const response = await request(app).post("/api/auth/register").send({
    username,
    email,
    password,
  });
  return response.body;
};

describe("Auth API", () => {
  let app;

  beforeAll(async () => {
    app = await createApp();
  });

  afterEach(async () => {
    const collections = await mongoose.connection.db.collections();
    for (const collection of collections) {
      await collection.deleteMany({});
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  it("registers a user and returns token", async () => {
    const response = await request(app).post("/api/auth/register").send({
      username: "captain",
      email: "captain@fleet.io",
      password: "secret",
    });

    expect(response.status).toBe(201);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user).toMatchObject({
      username: "captain",
      email: "captain@fleet.io",
    });
  });

  it("logs in a user with identifier", async () => {
    await registerUser(app, {
      username: "admiral",
      email: "admiral@fleet.io",
      password: "secret",
    });

    const response = await request(app).post("/api/auth/login").send({
      identifier: "admiral",
      password: "secret",
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeTruthy();
    expect(response.body.user).toMatchObject({
      username: "admiral",
      email: "admiral@fleet.io",
    });
  });

  it("returns current user for /api/users/me", async () => {
    const { token, user } = await registerUser(app, {
      username: "navigator",
      email: "nav@fleet.io",
      password: "secret",
    });

    const response = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.user).toMatchObject({
      id: user.id,
      username: "navigator",
      email: "nav@fleet.io",
    });
  });

  it("creates and fetches stats for /api/users/:userId/stats", async () => {
    const { token, user } = await registerUser(app, {
      username: "statuser",
      email: "stats@fleet.io",
      password: "secret",
    });

    const createResponse = await request(app)
      .put(`/api/users/${user.id}/stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        gamesPlayed: 1,
        wins: 1,
        losses: 0,
        hits: 5,
        misses: 3,
        shotsFired: 8,
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.stats).toMatchObject({
      userId: user.id,
      gamesPlayed: 1,
      wins: 1,
      losses: 0,
      hits: 5,
      misses: 3,
      shotsFired: 8,
    });

    const getResponse = await request(app)
      .get(`/api/users/${user.id}/stats`)
      .set("Authorization", `Bearer ${token}`);

    expect(getResponse.status).toBe(200);
    expect(getResponse.body.stats).toMatchObject({
      userId: user.id,
      gamesPlayed: 1,
    });
  });

  it("updates stats via PATCH /api/users/:userId/stats", async () => {
    const { token, user } = await registerUser(app, {
      username: "updater",
      email: "update@fleet.io",
      password: "secret",
    });

    const patchResponse = await request(app)
      .patch(`/api/users/${user.id}/stats`)
      .set("Authorization", `Bearer ${token}`)
      .send({ wins: 2, gamesPlayed: 3 });

    expect(patchResponse.status).toBe(200);
    expect(patchResponse.body.stats).toMatchObject({
      userId: user.id,
      wins: 2,
      gamesPlayed: 3,
    });
  });

  it("returns leaderboard entries from /api/leaderboard", async () => {
    const userA = await registerUser(app, {
      username: "alpha",
      email: "alpha@fleet.io",
      password: "secret",
    });
    const userB = await registerUser(app, {
      username: "bravo",
      email: "bravo@fleet.io",
      password: "secret",
    });

    await request(app)
      .patch(`/api/users/${userA.user.id}/stats`)
      .set("Authorization", `Bearer ${userA.token}`)
      .send({ wins: 3, gamesPlayed: 4 });

    await request(app)
      .patch(`/api/users/${userB.user.id}/stats`)
      .set("Authorization", `Bearer ${userB.token}`)
      .send({ wins: 1, gamesPlayed: 2 });

    const response = await request(app)
      .get("/api/leaderboard")
      .set("Authorization", `Bearer ${userA.token}`)
      .query({ limit: 5 });

    expect(response.status).toBe(200);
    expect(response.body.leaderboard.length).toBeGreaterThan(0);
    expect(response.body.leaderboard[0]).toMatchObject({
      username: "alpha",
      wins: 3,
    });
  });
});
