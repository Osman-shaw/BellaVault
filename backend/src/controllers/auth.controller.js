const crypto = require("crypto");
const User = require("../model/user.model");
const RefreshToken = require("../model/refreshToken.model");
const PhoneOtp = require("../model/phoneOtp.model");
const { env } = require("../config/env");
const {
  parseSierraLeoneMobile,
  syntheticEmailForPhone,
  maskPhoneNormalized,
} = require("../utils/sierraLeonePhone");
const {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyAuthToken,
  randomToken,
  hashToken,
} = require("../services/auth.service");

const OTP_TTL_MS = 10 * 60 * 1000;
const OTP_MAX_ATTEMPTS = 5;

function authPayload(user) {
  const payload = {
    user: {
      id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      emailVerified: user.emailVerified,
    },
  };
  if (user.phoneNormalized) {
    payload.user.phoneMasked = maskPhoneNormalized(user.phoneNormalized);
  }
  return payload;
}

function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function otpCodesEqual(storedHex, plainCode) {
  const a = Buffer.from(hashToken(plainCode), "hex");
  const b = Buffer.from(storedHex, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function maybeDevOtpResponse(plainCode) {
  if (!env.authReturnOtpInResponse) return {};
  return { devOtp: plainCode };
}

async function issueSession(user) {
  const accessToken = signAccessToken({ sub: user._id.toString(), role: user.role, email: user.email });
  const refreshToken = signRefreshToken({ sub: user._id.toString(), role: user.role, typ: "refresh" });

  const decoded = verifyAuthToken(refreshToken);
  const expiresAt = new Date(decoded.exp * 1000);

  await RefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
  };
}

async function register(req, res, next) {
  try {
    const { fullName, email, password, role } = req.body;
    const emailLower = email.toLowerCase();

    const passwordHash = await hashPassword(password);
    const verificationToken = randomToken();
    const tokenHashStored = hashToken(verificationToken);
    const emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const existing = await User.findOne({ email: emailLower });
    if (existing) {
      if (existing.emailVerified) {
        return res.status(409).json({ message: "Email already registered." });
      }

      existing.fullName = fullName;
      existing.passwordHash = passwordHash;
      existing.role = role;
      existing.emailVerificationTokenHash = tokenHashStored;
      existing.emailVerificationExpiresAt = emailVerificationExpiresAt;
      await existing.save();

      return res.status(201).json({
        message:
          "You already started signup with this email. We updated your details—verify your email before login.",
        verificationToken,
        ...authPayload(existing),
      });
    }

    const user = await User.create({
      fullName,
      email: emailLower,
      passwordHash,
      role,
      emailVerified: false,
      emailVerificationTokenHash: tokenHashStored,
      emailVerificationExpiresAt,
    });

    return res.status(201).json({
      message: "Registration successful. Verify your email before login.",
      verificationToken,
      ...authPayload(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { email, token } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: "User not found." });

    if (!user.emailVerificationTokenHash || !user.emailVerificationExpiresAt) {
      return res.status(400).json({ message: "No verification pending." });
    }

    if (user.emailVerificationExpiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Verification token expired." });
    }

    if (user.emailVerificationTokenHash !== hashToken(token)) {
      return res.status(400).json({ message: "Invalid verification token." });
    }

    user.emailVerified = true;
    user.emailVerificationTokenHash = null;
    user.emailVerificationExpiresAt = null;
    await user.save();

    return res.json({ message: "Email verified successfully." });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ message: "Invalid credentials." });
    }

    if (!user.emailVerified) {
      return res.status(403).json({ message: "Please verify your email before login." });
    }

    const tokens = await issueSession(user);

    return res.json({
      ...tokens,
      ...authPayload(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function refresh(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const payload = verifyAuthToken(refreshToken);

    if (payload.typ !== "refresh") {
      return res.status(400).json({ message: "Invalid refresh token." });
    }

    const tokenHash = hashToken(refreshToken);
    const saved = await RefreshToken.findOne({ tokenHash, revokedAt: null });
    if (!saved || saved.expiresAt.getTime() < Date.now()) {
      return res.status(401).json({ message: "Refresh token is invalid or expired." });
    }

    saved.revokedAt = new Date();
    await saved.save();

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: "User not found." });
    }

    const tokens = await issueSession(user);
    return res.json({
      ...tokens,
      ...authPayload(user),
    });
  } catch {
    return res.status(401).json({ message: "Refresh token is invalid or expired." });
  }
}

async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    const tokenHash = hashToken(refreshToken);

    const saved = await RefreshToken.findOne({ tokenHash, revokedAt: null });
    if (saved) {
      saved.revokedAt = new Date();
      await saved.save();
    }

    return res.status(204).send();
  } catch (error) {
    return next(error);
  }
}

async function phoneRegisterRequest(req, res, next) {
  try {
    const { fullName, phone, role } = req.body;
    const parsed = parseSierraLeoneMobile(phone);
    if (!parsed.ok) {
      return res.status(400).json({ message: parsed.message });
    }

    const existing = await User.findOne({ phoneNormalized: parsed.normalized });
    if (existing && existing.phoneVerified) {
      return res.status(409).json({
        message: "This number is already registered. Sign in with your phone instead.",
      });
    }

    const plain = generateOtpCode();
    const codeHash = hashToken(plain);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await PhoneOtp.findOneAndUpdate(
      { phoneNormalized: parsed.normalized, purpose: "register" },
      {
        phoneNormalized: parsed.normalized,
        purpose: "register",
        codeHash,
        expiresAt,
        attempts: 0,
        pendingFullName: fullName.trim(),
        pendingRole: role,
      },
      { upsert: true, new: true }
    );

    return res.status(200).json({
      message: `We sent a verification code to your ${parsed.carrier} number. Enter it to finish signup.`,
      carrier: parsed.carrier,
      ...maybeDevOtpResponse(plain),
    });
  } catch (error) {
    return next(error);
  }
}

async function phoneRegisterVerify(req, res, next) {
  try {
    const { phone, code } = req.body;
    const parsed = parseSierraLeoneMobile(phone);
    if (!parsed.ok) {
      return res.status(400).json({ message: parsed.message });
    }

    const record = await PhoneOtp.findOne({
      phoneNormalized: parsed.normalized,
      purpose: "register",
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Code expired or not found. Request a new code." });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await PhoneOtp.deleteOne({ _id: record._id });
      return res.status(429).json({ message: "Too many attempts. Request a new code." });
    }

    record.attempts += 1;
    await record.save();

    if (!otpCodesEqual(record.codeHash, String(code).trim())) {
      return res.status(400).json({ message: "Invalid code." });
    }

    const dupPhone = await User.findOne({ phoneNormalized: parsed.normalized });
    if (dupPhone && dupPhone.phoneVerified) {
      await PhoneOtp.deleteOne({ _id: record._id });
      return res.status(409).json({ message: "This number is already registered." });
    }

    const email = syntheticEmailForPhone(parsed.national8).toLowerCase();
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      await PhoneOtp.deleteOne({ _id: record._id });
      return res.status(409).json({ message: "An account already exists for this number." });
    }

    const passwordHash = await hashPassword(randomToken(32));
    const user = await User.create({
      fullName: record.pendingFullName,
      email,
      passwordHash,
      role: record.pendingRole,
      emailVerified: true,
      phoneNormalized: parsed.normalized,
      phoneVerified: true,
    });

    await PhoneOtp.deleteOne({ _id: record._id });

    const tokens = await issueSession(user);
    return res.status(201).json({
      ...tokens,
      ...authPayload(user),
    });
  } catch (error) {
    return next(error);
  }
}

async function phoneLoginRequest(req, res, next) {
  try {
    const { phone } = req.body;
    const parsed = parseSierraLeoneMobile(phone);
    if (!parsed.ok) {
      return res.status(400).json({ message: parsed.message });
    }

    const user = await User.findOne({ phoneNormalized: parsed.normalized, phoneVerified: true });
    if (!user) {
      return res.status(404).json({ message: "No verified account for this number. Register first." });
    }

    const plain = generateOtpCode();
    const codeHash = hashToken(plain);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    await PhoneOtp.findOneAndUpdate(
      { phoneNormalized: parsed.normalized, purpose: "login" },
      {
        phoneNormalized: parsed.normalized,
        purpose: "login",
        codeHash,
        expiresAt,
        attempts: 0,
        pendingFullName: null,
        pendingRole: null,
      },
      { upsert: true, new: true }
    );

    return res.json({
      message: `Enter the code we sent to your ${parsed.carrier} number.`,
      carrier: parsed.carrier,
      ...maybeDevOtpResponse(plain),
    });
  } catch (error) {
    return next(error);
  }
}

async function phoneLoginVerify(req, res, next) {
  try {
    const { phone, code } = req.body;
    const parsed = parseSierraLeoneMobile(phone);
    if (!parsed.ok) {
      return res.status(400).json({ message: parsed.message });
    }

    const user = await User.findOne({ phoneNormalized: parsed.normalized, phoneVerified: true });
    if (!user) {
      return res.status(404).json({ message: "No verified account for this number." });
    }

    const record = await PhoneOtp.findOne({
      phoneNormalized: parsed.normalized,
      purpose: "login",
    });
    if (!record || record.expiresAt.getTime() < Date.now()) {
      return res.status(400).json({ message: "Code expired or not found. Request a new code." });
    }

    if (record.attempts >= OTP_MAX_ATTEMPTS) {
      await PhoneOtp.deleteOne({ _id: record._id });
      return res.status(429).json({ message: "Too many attempts. Request a new code." });
    }

    record.attempts += 1;
    await record.save();

    if (!otpCodesEqual(record.codeHash, String(code).trim())) {
      return res.status(400).json({ message: "Invalid code." });
    }

    await PhoneOtp.deleteOne({ _id: record._id });

    const tokens = await issueSession(user);
    return res.json({
      ...tokens,
      ...authPayload(user),
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  register,
  verifyEmail,
  login,
  refresh,
  logout,
  phoneRegisterRequest,
  phoneRegisterVerify,
  phoneLoginRequest,
  phoneLoginVerify,
};
