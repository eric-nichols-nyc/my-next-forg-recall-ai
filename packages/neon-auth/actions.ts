"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { keys } from "./keys";
import type { SignInState, SignUpState } from "./types";

const signUpSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(6, "Password must be at least 6 characters")
    .max(72, "Password must be less than 72 characters"),
  name: z.string().min(1, "Name is required").optional(),
});

const signInSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export async function signUpAction(
  _prevState: SignUpState,
  formData: FormData
): Promise<SignUpState> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
  };

  const validationResult = signUpSchema.safeParse(rawData);

  if (!validationResult.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { email, password, name } = validationResult.data;
  const env = keys();
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-up`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        password,
        name,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.message || "Failed to sign up",
      };
    }

    return {
      success: true,
      message:
        "Account created successfully! Please check your email to verify your account.",
    };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred during sign up",
    };
  }
}

export async function signInAction(
  _prevState: SignInState,
  formData: FormData
): Promise<SignInState | undefined> {
  const rawData = {
    email: formData.get("email"),
    password: formData.get("password"),
  };

  const validationResult = signInSchema.safeParse(rawData);

  if (!validationResult.success) {
    return {
      success: false,
      message: "Validation failed",
      errors: validationResult.error.flatten().fieldErrors,
    };
  }

  const { email, password } = validationResult.data;
  const env = keys();
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const response = await fetch(`${baseUrl}/api/auth/sign-in`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        email,
        password,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        message: error.message || "Invalid email or password",
      };
    }

    redirect("/dashboard");
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error
          ? error.message
          : "An error occurred during sign in",
    };
  }
}

export async function signOutAction(): Promise<void> {
  const env = keys();
  const baseUrl = env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    await fetch(`${baseUrl}/api/auth/sign-out`, {
      method: "POST",
      credentials: "include",
    });

    redirect("/");
  } catch (error) {
    console.error("Sign out error:", error);
    redirect("/");
  }
}

