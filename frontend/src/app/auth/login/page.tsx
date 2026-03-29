"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { AuthInlineLink, AuthLinkRow } from "@/components/auth/AuthLinkRow";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthFeedback } from "@/components/auth/AuthFeedback";
import { FormButton } from "@/components/form/FormButton";
import { FormCard } from "@/components/form/FormCard";
import { FormInput } from "@/components/form/FormInput";
import { apiService } from "@/services/apiService";
import { writeSession } from "@/state/auth";

type Method = "email" | "phone";

export default function LoginPage() {
  const router = useRouter();
  const [method, setMethod] = useState<Method>("email");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [phoneStep, setPhoneStep] = useState<0 | 1>(0);
  const [devOtp, setDevOtp] = useState("");

  const [error, setError] = useState("");
  const [phoneInstruction, setPhoneInstruction] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmitEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);
      const session = await apiService.login({ email, password });
      writeSession(session);
      router.push("/deals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  async function onPhoneRequestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPhoneInstruction("");
    setDevOtp("");

    try {
      setLoading(true);
      const res = await apiService.phoneLoginRequest({ phone });
      setPhoneStep(1);
      setPhoneInstruction(res.message);
      if (res.devOtp) setDevOtp(res.devOtp);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send code.");
    } finally {
      setLoading(false);
    }
  }

  async function onPhoneVerify(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);
      const session = await apiService.phoneLoginVerify({ phone, code: otp.replace(/\D/g, "").slice(0, 6) });
      writeSession(session);
      router.push("/deals");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed.");
    } finally {
      setLoading(false);
    }
  }

  function switchMethod(next: Method) {
    setMethod(next);
    setError("");
    setPhoneInstruction("");
    setDevOtp("");
    setPhoneStep(0);
    setOtp("");
  }

  return (
    <main>
      <AuthShell eyebrow="Account access">
        <div className="auth-method-tabs" role="tablist" aria-label="Sign-in method">
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
            title="Welcome back"
            description="Sign in with the email and password you used at registration. You must verify your email before logging in."
            onSubmit={onSubmitEmail}
          >
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
              placeholder="••••••••"
              type="password"
              autoComplete="current-password"
              required
            />
            <FormButton variant="auth" label="Sign in" loadingLabel="Signing in…" loading={loading} />
          </FormCard>
        ) : phoneStep === 0 ? (
          <FormCard
            variant="auth"
            title="Sign in with your phone"
            description="Use a valid Orange, Africell, or QCell number (+232 or 0 prefix). We send a one-time 6-digit code (SMS integration can be wired later; in development the code may appear below)."
            onSubmit={onPhoneRequestCode}
          >
            <FormInput
              label="Mobile number"
              value={phone}
              onChange={setPhone}
              placeholder="+232 74 123456 or 074 123456"
              type="text"
              autoComplete="tel"
              required
            />
            <FormButton variant="auth" label="Send code" loadingLabel="Sending…" loading={loading} />
          </FormCard>
        ) : (
          <FormCard variant="auth" title="Enter verification code" description="Type the 6-digit code for your number." onSubmit={onPhoneVerify}>
            <p className="form-description" style={{ marginTop: 0 }}>
              Number: <strong>{phone.trim() || "—"}</strong>
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
            <FormButton variant="auth" label="Sign in" loadingLabel="Signing in…" loading={loading} />
            <button
              type="button"
              className="btn-ghost"
              style={{ marginTop: 8, width: "100%" }}
              onClick={() => {
                setPhoneStep(0);
                setOtp("");
                setError("");
                setPhoneInstruction("");
                setDevOtp("");
              }}
            >
              Use a different number
            </button>
          </FormCard>
        )}

        {method === "email" && error ? <AuthFeedback variant="error">{error}</AuthFeedback> : null}
        {method === "phone" && phoneInstruction ? <AuthFeedback variant="success">{phoneInstruction}</AuthFeedback> : null}
        {method === "phone" && error ? <AuthFeedback variant="error">{error}</AuthFeedback> : null}

        {devOtp ? (
          <div className="auth-dev-token">
            <strong>Dev / test code</strong> (only when the API allows exposing OTP):
            <br />
            <code>{devOtp}</code>
          </div>
        ) : null}

        <AuthLinkRow>
          No account yet? <AuthInlineLink href="/auth/register">Create one</AuthInlineLink>
        </AuthLinkRow>
      </AuthShell>
    </main>
  );
}
