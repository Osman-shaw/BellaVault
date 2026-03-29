"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AuthInlineLink, AuthLinkRow } from "@/components/auth/AuthLinkRow";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AuthFeedback } from "@/components/auth/AuthFeedback";
import { FormButton } from "@/components/form/FormButton";
import { FormCard } from "@/components/form/FormCard";
import { FormInput } from "@/components/form/FormInput";
import { FormSelect } from "@/components/form/FormSelect";
import { apiService } from "@/services/apiService";
import { writeSession } from "@/state/auth";

function passwordChecks(password: string) {
  return {
    length: password.length >= 8,
    lower: /[a-z]/.test(password),
    upper: /[A-Z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z\d]/.test(password),
  };
}

type Method = "email" | "phone";

export default function RegisterPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "secretary" | "associate_director">("secretary");
  const [message, setMessage] = useState("");
  const [verificationToken, setVerificationToken] = useState("");
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState("");
  const [phoneRole, setPhoneRole] = useState<"admin" | "secretary" | "associate_director">("secretary");
  const [phoneFullName, setPhoneFullName] = useState("");
  const [phoneStep, setPhoneStep] = useState<0 | 1>(0);
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");

  const checks = useMemo(() => passwordChecks(password), [password]);
  const strong = Object.values(checks).every(Boolean);

  async function onSubmitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setVerificationToken("");

    if (!strong) {
      setMessage("Please meet all password requirements below.");
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.register({ fullName, email, password, role });
      setVerificationToken(response.verificationToken);
      setMessage(response.message || "Check your email (or use the dev token below), then verify before login.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onPhoneRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setDevOtp("");

    try {
      setLoading(true);
      const res = await apiService.phoneRegisterRequest({
        fullName: phoneFullName,
        phone,
        role: phoneRole,
      });
      setPhoneStep(1);
      setMessage(res.message);
      if (res.devOtp) setDevOtp(res.devOtp);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not send code.");
    } finally {
      setLoading(false);
    }
  }

  async function onPhoneVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    try {
      setLoading(true);
      const session = await apiService.phoneRegisterVerify({
        phone,
        code: otp.replace(/\D/g, "").slice(0, 6),
      });
      writeSession(session);
      router.push("/deals");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not complete signup.");
    } finally {
      setLoading(false);
    }
  }

  function switchMethod(next: Method) {
    setMethod(next);
    setMessage("");
    setVerificationToken("");
    setDevOtp("");
    setPhoneStep(0);
    setOtp("");
  }

  return (
    <main>
      <AuthShell eyebrow="New account">
        <div className="auth-method-tabs" role="tablist" aria-label="Registration method">
          <button
            type="button"
            role="tab"
            aria-selected={method === "email"}
            className={`auth-method-tab${method === "email" ? " active" : ""}`}
            onClick={() => switchMethod("email")}
          >
            Email &amp; password
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={method === "phone"}
            className={`auth-method-tab${method === "phone" ? " active" : ""}`}
            onClick={() => switchMethod("phone")}
          >
            Sierra Leone phone
          </button>
        </div>

        {method === "email" ? (
          <FormCard
            variant="auth"
            title="Create your account"
            description="Choose your role and a strong password. Staff accounts are for trusted team members only."
            onSubmit={onSubmitEmail}
          >
            <FormInput
              label="Full name"
              value={fullName}
              onChange={setFullName}
              placeholder="Jane Doe"
              autoComplete="name"
              required
            />
            <FormInput
              label="Email"
              value={email}
              onChange={setEmail}
              placeholder="you@company.com"
              type="email"
              autoComplete="email"
              required
            />
            <FormInput
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Create a strong password"
              type="password"
              autoComplete="new-password"
              required
            />
            <PasswordStrength checks={checks} />
            <FormSelect
              fieldLabel="Role"
              value={role}
              onChange={(value) => setRole(value as "admin" | "secretary" | "associate_director")}
              options={[
                { label: "Admin", value: "admin" },
                { label: "Secretary", value: "secretary" },
                { label: "Associate Director", value: "associate_director" },
              ]}
            />
            <FormButton variant="auth" label="Create account" loadingLabel="Creating account…" loading={loading} />
          </FormCard>
        ) : phoneStep === 0 ? (
          <FormCard
            variant="auth"
            title="Register with your phone"
            description="Orange, Africell, or QCell numbers only (+232). No password — you sign in with a code sent to this number (add SMS in production; dev mode may show the code below)."
            onSubmit={onPhoneRequestCode}
          >
            <FormInput
              label="Full name"
              value={phoneFullName}
              onChange={setPhoneFullName}
              placeholder="Jane Doe"
              autoComplete="name"
              required
            />
            <FormInput
              label="Mobile number"
              value={phone}
              onChange={setPhone}
              placeholder="+232 74 123456 or 074 123456"
              type="text"
              autoComplete="tel"
              required
            />
            <FormSelect
              fieldLabel="Role"
              value={phoneRole}
              onChange={(value) => setPhoneRole(value as "admin" | "secretary" | "associate_director")}
              options={[
                { label: "Admin", value: "admin" },
                { label: "Secretary", value: "secretary" },
                { label: "Associate Director", value: "associate_director" },
              ]}
            />
            <FormButton variant="auth" label="Send verification code" loadingLabel="Sending…" loading={loading} />
          </FormCard>
        ) : (
          <FormCard variant="auth" title="Verify your number" description="Enter the 6-digit code we sent." onSubmit={onPhoneVerify}>
            <p className="form-description" style={{ marginTop: 0 }}>
              {phoneFullName.trim() ? <strong>{phoneFullName.trim()}</strong> : null}
              {phoneFullName.trim() ? " · " : null}
              <strong>{phone.trim()}</strong>
            </p>
            <FormInput
              label="6-digit code"
              value={otp}
              onChange={(v) => setOtp(v.replace(/\D/g, "").slice(0, 6))}
              placeholder="123456"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
            />
            <FormButton variant="auth" label="Complete registration" loadingLabel="Verifying…" loading={loading} />
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: 8, width: "100%" }}
              onClick={() => {
                setPhoneStep(0);
                setOtp("");
                setMessage("");
                setDevOtp("");
              }}
            >
              Start over
            </button>
          </FormCard>
        )}

        {message ? (
          <AuthFeedback
            variant={
              verificationToken || (method === "phone" && phoneStep === 1 && !message.toLowerCase().includes("invalid"))
                ? "success"
                : "error"
            }
          >
            {message}
          </AuthFeedback>
        ) : null}
        {verificationToken ? (
          <div className="auth-dev-token">
            <strong>Dev verification token</strong> (copy for the verify step):
            <br />
            <code>{verificationToken}</code>
            <AuthLinkRow>
              <AuthInlineLink href="/auth/verify-email">Verify email →</AuthInlineLink>
            </AuthLinkRow>
          </div>
        ) : null}
        {devOtp ? (
          <div className="auth-dev-token">
            <strong>Dev / test code</strong> (only when the API allows exposing OTP):
            <br />
            <code>{devOtp}</code>
          </div>
        ) : null}

        <AuthLinkRow>
          Already have an account? <AuthInlineLink href="/auth/login">Sign in</AuthInlineLink>
        </AuthLinkRow>
      </AuthShell>
    </main>
  );
}
