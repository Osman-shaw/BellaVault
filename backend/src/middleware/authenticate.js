const { verifyAuthToken } = require("../services/auth.service");

function optionalAuth(req, _res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  if (!token) return next();

  try {
    const payload = verifyAuthToken(token);
    if (payload.typ === "refresh") {
      return next();
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
      email: payload.email,
      tenantId: payload.tid || null,
    };
    return next();
  } catch {
    return next();
  }
}

function requireAuth(req, res, next) {
  if (!req.user?.id) {
    return res.status(401).json({ message: "Authentication required." });
  }
  return next();
}

module.exports = { optionalAuth, requireAuth };
