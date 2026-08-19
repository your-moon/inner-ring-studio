"use client";

import AuthShell, { authButton, authInput } from "@/components/auth-shell";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useState } from "react";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"cloud" | "selfhosted" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((j) => setMode(j.mode === "cloud" ? "cloud" : "selfhosted"))
      .catch(() => setMode("selfhosted"));
  }, []);

  const isCloud = mode === "cloud";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isCloud ? { email, password } : { password }),
      });
      if (res.ok) {
        router.replace(params.get("next") || "/local");
        return;
      }
      const j = await res.json().catch(() => ({}));
      setError(j.error || (isCloud ? "Invalid email or password" : "Incorrect password"));
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title="Sign in"
      subtitle={isCloud ? "Welcome back — sign in to your workspace." : "Enter your password to continue."}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {isCloud && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
              Email
            </label>
            <input
              type="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInput}
              placeholder="you@example.com"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Password
          </label>
          <input
            type="password"
            autoFocus={!isCloud}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInput}
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading || !password || (isCloud && !email)}
          className={authButton}
        >
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      {isCloud && (
        <p className="mt-6 text-center text-sm text-neutral-500">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-blue-600 hover:underline">
            Sign up
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
