const express = require("express");
const {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  phoneRegisterRequest,
  phoneRegisterVerify,
  phoneLoginRequest,
  phoneLoginVerify,
} = require("../controllers/auth.controller");
const { validate } = require("../middleware/validate");
const {
  registerSchema,
  verifyEmailSchema,
  loginSchema,
  refreshSchema,
  phoneRegisterRequestSchema,
  phoneRegisterVerifySchema,
  phoneLoginRequestSchema,
  phoneLoginVerifySchema,
} = require("../config/validation");

const router = express.Router();

router.post("/register", validate(registerSchema), register);
router.post("/verify-email", validate(verifyEmailSchema), verifyEmail);
router.post("/login", validate(loginSchema), login);
router.post("/phone/register/request", validate(phoneRegisterRequestSchema), phoneRegisterRequest);
router.post("/phone/register/verify", validate(phoneRegisterVerifySchema), phoneRegisterVerify);
router.post("/phone/login/request", validate(phoneLoginRequestSchema), phoneLoginRequest);
router.post("/phone/login/verify", validate(phoneLoginVerifySchema), phoneLoginVerify);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", validate(refreshSchema), logout);

module.exports = router;
