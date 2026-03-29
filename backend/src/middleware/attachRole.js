const { ROLES } = require("../config/rbac");

function attachRole(req, _res, next) {
  const rawRole = (req.headers["x-user-role"] || "").toString().trim().toLowerCase();

  if (!rawRole) {
    return next();
  }

  if (!Object.values(ROLES).includes(rawRole)) {
    return _res.status(400).json({ message: "Invalid role provided in x-user-role header" });
  }

  req.user = {
    role: rawRole,
  };
  return next();
}

module.exports = { attachRole };
