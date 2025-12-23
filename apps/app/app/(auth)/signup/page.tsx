"use client";

import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { useActionState } from "react";
import { type SignupState, signupAction } from "./actions";

const initialState: SignupState = {
  success: false,
  message: "",
};

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState(
    signupAction,
    initialState
  );

  const emailErrors = state.errors?.email ?? [];
  const passwordErrors = state.errors?.password ?? [];
  const hasEmailError: boolean = emailErrors.length > 0;
  const hasPasswordError: boolean = passwordErrors.length > 0;
  const emailDescribedBy = hasEmailError ? "email-error" : undefined;
  const passwordDescribedBy = hasPasswordError ? "password-error" : undefined;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Sign Up</CardTitle>
          <CardDescription>Create a new account</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state.message ? (
              <div
                className={`rounded-lg p-3 text-sm ${
                  state.success
                    ? "bg-green-500/10 text-green-600"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {state.message}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                aria-describedby={emailDescribedBy}
                aria-invalid={hasEmailError}
                id="email"
                name="email"
                placeholder="you@example.com"
                required
                type="email"
              />
              {hasEmailError ? (
                <p className="text-destructive text-sm" id="email-error">
                  {emailErrors[0]}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                aria-describedby={passwordDescribedBy}
                aria-invalid={hasPasswordError}
                id="password"
                minLength={6}
                name="password"
                placeholder="••••••••"
                required
                type="password"
              />
              {hasPasswordError ? (
                <p className="text-destructive text-sm" id="password-error">
                  {passwordErrors[0]}
                </p>
              ) : null}
            </div>

            <Button className="w-full" disabled={isPending} type="submit">
              {isPending ? "Signing up..." : "Sign Up"}
            </Button>

            <p className="text-center text-muted-foreground text-sm">
              Already have an account?{" "}
              <a className="text-primary underline" href="/login">
                Log in
              </a>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
