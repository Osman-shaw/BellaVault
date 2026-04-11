const request = require("supertest");

function makeToken(role = "admin") {
  const { signAccessToken } = require("../src/services/auth.service");
  const tid = process.env.DEFAULT_TENANT_ID || "507f1f77bcf86cd799439011";
  return signAccessToken({ sub: "507f1f77bcf86cd799439011", role, email: "test@example.com", tid });
}

function asRole(req, role = "admin") {
  const token = makeToken(role);
  return req.set("Authorization", `Bearer ${token}`).set("x-user-role", role);
}

describe("API validation, auth, RBAC, and rate limiting", () => {
  jest.setTimeout(30000);

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = "test-secret";
    process.env.DEFAULT_TENANT_ID = "507f1f77bcf86cd799439011";
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "40";
  });

  it("requires auth for create endpoints", async () => {
    const { createApp } = require("../src/server/app");
    const app = createApp();

    const entityResponse = await request(app).post("/api/entities").send({ name: "Test" });
    const dealResponse = await request(app).post("/api/deals").send({});
    const purchaseResponse = await request(app).post("/api/purchases").send({});
    const saleResponse = await request(app).post("/api/sales").send({});
    const borrowResponse = await request(app).post("/api/borrows").send({});

    expect(entityResponse.status).toBe(401);
    expect(dealResponse.status).toBe(401);
    expect(purchaseResponse.status).toBe(401);
    expect(saleResponse.status).toBe(401);
    expect(borrowResponse.status).toBe(401);
  });

  it("rejects invalid entity payload on create", async () => {
    const { createApp } = require("../src/server/app");
    const app = createApp();

    const response = await asRole(request(app).post("/api/entities"), "admin").send({ name: "A" });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });

  it("rejects invalid deal payload on create", async () => {
    const { createApp } = require("../src/server/app");
    const app = createApp();

    const response = await asRole(request(app).post("/api/deals"), "admin").send({
      entityId: "not-an-object-id",
      commodity: "GOLD",
      quantity: -1,
      spotPrice: 0,
    });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe("Validation failed");
  });

  it("rejects invalid id on update and delete endpoints", async () => {
    const { createApp } = require("../src/server/app");
    const app = createApp();

    const updateEntity = await asRole(request(app).put("/api/entities/invalid-id"), "admin").send({ name: "Valid Name" });
    const deleteEntity = await asRole(request(app).delete("/api/entities/invalid-id"), "admin");
    const updateDeal = await asRole(request(app).put("/api/deals/invalid-id"), "admin").send({ quantity: 1 });
    const deleteDeal = await asRole(request(app).delete("/api/deals/invalid-id"), "admin");
    const updatePurchase = await asRole(request(app).put("/api/purchases/invalid-id"), "admin").send({ clientName: "Valid Name" });
    const deletePurchase = await asRole(request(app).delete("/api/purchases/invalid-id"), "admin");
    const updateBorrow = await asRole(request(app).put("/api/borrows/invalid-id"), "admin").send({ borrowerName: "Valid Name" });
    const deleteBorrow = await asRole(request(app).delete("/api/borrows/invalid-id"), "admin");

    expect(updateEntity.status).toBe(400);
    expect(deleteEntity.status).toBe(400);
    expect(updateDeal.status).toBe(400);
    expect(deleteDeal.status).toBe(400);
    expect(updatePurchase.status).toBe(400);
    expect(deletePurchase.status).toBe(400);
    expect(updateBorrow.status).toBe(400);
    expect(deleteBorrow.status).toBe(400);
  });

  it("blocks protected endpoints when role is missing", async () => {
    const { createApp } = require("../src/server/app");
    const app = createApp();

    const response = await request(app).get("/api/dashboard");
    const reportsResponse = await request(app).get("/api/reports/overview");

    expect(response.status).toBe(401);
    expect(response.body.message).toBe("Authentication role is required.");
    expect(reportsResponse.status).toBe(401);
    expect(reportsResponse.body.message).toBe("Authentication role is required.");
  });

  it("enforces role permissions for delete", async () => {
    const { createApp } = require("../src/server/app");
    const app = createApp();

    const response = await asRole(request(app).delete("/api/deals/507f1f77bcf86cd799439011"), "secretary");

    expect(response.status).toBe(403);
    expect(response.body.message).toBe("Forbidden for this role.");
  });

  it("blocks associate director from updating or deleting purchases", async () => {
    const { createApp } = require("../src/server/app");
    const app = createApp();
    const id = "507f1f77bcf86cd799439011";

    const updateRes = await asRole(request(app).put(`/api/purchases/${id}`), "associate_director").send({ status: "paid" });
    const deleteRes = await asRole(request(app).delete(`/api/purchases/${id}`), "associate_director");

    expect(updateRes.status).toBe(403);
    expect(deleteRes.status).toBe(403);
    expect(updateRes.body.message).toBe("Forbidden for this role.");
  });

  it("blocks associate director from updating or deleting borrows", async () => {
    const { createApp } = require("../src/server/app");
    const app = createApp();
    const id = "507f1f77bcf86cd799439011";

    const updateRes = await asRole(request(app).put(`/api/borrows/${id}`), "associate_director").send({
      additionalPayment: 10,
    });
    const deleteRes = await asRole(request(app).delete(`/api/borrows/${id}`), "associate_director");

    expect(updateRes.status).toBe(403);
    expect(deleteRes.status).toBe(403);
  });

  it("applies rate limiting to API routes", async () => {
    jest.resetModules();
    process.env.JWT_SECRET = "test-secret";
    process.env.RATE_LIMIT_WINDOW_MS = "60000";
    process.env.RATE_LIMIT_MAX = "2";
    const { createApp } = require("../src/server/app");
    const app = createApp();

    const first = await request(app).get("/api/health");
    const second = await request(app).get("/api/health");
    const third = await request(app).get("/api/health");

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(429);
    expect(third.body.message).toBe("Too many requests, please try again later.");
  });
});
