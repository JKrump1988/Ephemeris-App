import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/context/AuthContext";


const initialState = {
  name: "",
  email: "",
  password: "",
};


export default function AuthPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading, login, register } = useAuth();
  const [mode, setMode] = useState("signin");
  const [form, setForm] = useState(initialState);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  const title = useMemo(() => (mode === "signin" ? "Return to your chart" : "Create your Ephemeral account"), [mode]);

  const updateField = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      const action = mode === "signin" ? login : register;
      const payload = mode === "signin"
        ? { email: form.email, password: form.password }
        : { name: form.name, email: form.email, password: form.password };
      const result = await action(payload);
      toast.success(mode === "signin" ? "Welcome back to Ephemeral" : "Account created");
      navigate(result.user.has_chart ? "/dashboard" : "/onboarding", { replace: true });
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Something went wrong while authenticating.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-10rem)] gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center" data-testid="auth-page">
      <div className="space-y-6">
        <p className="text-[11px] uppercase tracking-[0.28em] text-primary" data-testid="auth-page-eyebrow">Email/password authentication</p>
        <h1 className="font-display text-5xl leading-[0.95] text-white md:text-6xl" data-testid="auth-page-title">{title}</h1>
        <p className="max-w-xl text-base leading-8 text-slate-300" data-testid="auth-page-description">
          Your saved chart becomes the foundation for future tier unlocks, daily insights, and every deeper astrological layer that follows.
        </p>
      </div>

      <Card className="border border-white/10 bg-white/5 shadow-[0_30px_100px_rgba(0,0,0,0.4)] backdrop-blur-xl" data-testid="auth-form-card">
        <CardContent className="space-y-8 p-7 md:p-9">
          <div className="flex gap-3" data-testid="auth-mode-toggle">
            <Button className={mode === "signin" ? "border border-primary/50 bg-primary text-black" : "border border-white/10 bg-white/5 text-white"} data-testid="signin-mode-button" onClick={() => setMode("signin")} type="button" variant="ghost">
              Sign in
            </Button>
            <Button className={mode === "signup" ? "border border-primary/50 bg-primary text-black" : "border border-white/10 bg-white/5 text-white"} data-testid="signup-mode-button" onClick={() => setMode("signup")} type="button" variant="ghost">
              Create account
            </Button>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit} data-testid="auth-form">
            {mode === "signup" ? (
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.26em] text-slate-400" htmlFor="name">Name</label>
                <Input className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-500" data-testid="auth-name-input" id="name" name="name" onChange={updateField} placeholder="Aster Vale" value={form.name} />
              </div>
            ) : null}

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.26em] text-slate-400" htmlFor="email">Email</label>
              <Input className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-500" data-testid="auth-email-input" id="email" name="email" onChange={updateField} placeholder="you@example.com" type="email" value={form.email} />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-[0.26em] text-slate-400" htmlFor="password">Password</label>
              <Input className="h-12 border-white/10 bg-white/5 text-white placeholder:text-slate-500" data-testid="auth-password-input" id="password" name="password" onChange={updateField} placeholder="At least 8 characters" type="password" value={form.password} />
            </div>

            <Button className="w-full border border-primary/50 bg-primary px-6 py-3 text-xs uppercase tracking-[0.24em] text-black hover:bg-primary/90" data-testid="auth-submit-button" disabled={submitting} type="submit">
              {submitting ? "Please wait…" : mode === "signin" ? "Enter Ephemeral" : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}