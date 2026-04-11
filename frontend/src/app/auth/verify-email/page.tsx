"use client";

import { FormEvent, useEffect, useState } from "react";
import { AuthInlineLink, AuthLinkRow } from "@/components/auth/AuthLinkRow";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthFeedback } from "@/components/auth/AuthFeedback";
import { FormButton } from "@/components/form/FormButton";
import { FormCard } from "@/components/form/FormCard";
import { FormInput } from "@/components/form/FormInput";
import { apiService } from "@/services/apiService";

export default function VerifyEmailPage() {
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [tenantSlug, setTenantSlug] = useState("default");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tenant");
    if (t && t.trim().length >= 2) setTenantSlug(t.trim().toLowerCase());
  }, []);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    try {
      setLoading(true);
      const response = await apiService.verifyEmail({ email, token, tenantSlug });
      setSuccess(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <AuthShell eyebrow="Email confirmation">
        <FormCard
          variant="auth"
          title="Verify your email"
          description="Enter the same email you registered with and the verification token from the registration screen (or your email in production)."
          onSubmit={onSubmit}
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
            label="Verification token"
            value={token}
            onChange={setToken}
            placeholder="Paste token from registration"
            autoComplete="one-time-code"
            required
          />
          <FormInput
            label="Organization slug"
            value={tenantSlug}
            onChange={setTenantSlug}
            placeholder="default"
            type="text"
            autoComplete="organization"
          />
          <FormButton variant="auth" label="Confirm email" loadingLabel="Verifying…" loading={loading} />
        </FormCard>
        {error ? <AuthFeedback variant="error">{error}</AuthFeedback> : null}
        {success ? <AuthFeedback variant="success">{success}</AuthFeedback> : null}
        <AuthLinkRow>
          <AuthInlineLink href="/auth/login">Back to sign in</AuthInlineLink>
        </AuthLinkRow>
      </AuthShell>
    </main>
  );
}
