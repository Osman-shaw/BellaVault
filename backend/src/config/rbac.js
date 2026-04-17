const ROLES = {
  ADMIN: "admin",
  SECRETARY: "secretary",
  ASSOCIATE_DIRECTOR: "associate_director",
};

const PERMISSIONS = {
  "dashboard:read": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "entities:read": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "entities:create": [ROLES.ADMIN, ROLES.SECRETARY],
  "entities:update": [ROLES.ADMIN, ROLES.SECRETARY],
  "entities:delete": [ROLES.ADMIN],
  "deals:read": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "deals:create": [ROLES.ADMIN, ROLES.SECRETARY],
  "deals:update": [ROLES.ADMIN, ROLES.ASSOCIATE_DIRECTOR],
  "deals:delete": [ROLES.ADMIN],
  "purchases:read": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "purchases:create": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "purchases:update": [ROLES.ADMIN, ROLES.SECRETARY],
  "purchases:delete": [ROLES.ADMIN, ROLES.SECRETARY],
  "sales:read": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "sales:create": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "sales:update": [ROLES.ADMIN, ROLES.SECRETARY],
  "sales:delete": [ROLES.ADMIN, ROLES.SECRETARY],
  "reports:read": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "borrows:read": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "reminders:read": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "borrows:create": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "borrows:update": [ROLES.ADMIN, ROLES.SECRETARY],
  "borrows:delete": [ROLES.ADMIN, ROLES.SECRETARY],
  "vault:read": [ROLES.ADMIN, ROLES.SECRETARY, ROLES.ASSOCIATE_DIRECTOR],
  "vault:deposit": [ROLES.ADMIN, ROLES.SECRETARY],
  "market:diagnostics": [ROLES.ADMIN],
};

const PUBLIC_PERMISSIONS = new Set([
  "entities:read",
  "deals:read",
  "purchases:read",
  "sales:read",
  "borrows:read",
  "vault:read",
]);

module.exports = {
  ROLES,
  PERMISSIONS,
  PUBLIC_PERMISSIONS,
};
