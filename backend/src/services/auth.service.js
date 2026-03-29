const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { env } = require("../config/env");

async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

async function verifyPassword(password, hash) {
  return bcrypt.compare(password, hash);
}

function signAccessToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "15m" });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: "14d" });
}

function verifyAuthToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

function randomToken(size = 24) {
  return crypto.randomBytes(size).toString("hex");
}

function hashToken(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function passwordStrong(password) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/.test(password);
}

module.exports = {
  hashPassword,
  verifyPassword,
  signAccessToken,
  signRefreshToken,
  verifyAuthToken,
  randomToken,
  hashToken,
  passwordStrong,
};
