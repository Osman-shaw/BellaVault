const { PERMISSIONS, PUBLIC_PERMISSIONS } = require("../config/rbac");

function requirePermission(permission) {
  return (req, res, next) => {
    const allowedRoles = PERMISSIONS[permission] || [];
    const role = req.user?.role;

    if (!role) {
      if (PUBLIC_PERMISSIONS.has(permission)) {
        return next();
      }
      return res.status(401).json({ message: "Authentication role is required." });
    }

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: "Forbidden for this role." });
    }

    return next();
  };
}

module.exports = { requirePermission };
