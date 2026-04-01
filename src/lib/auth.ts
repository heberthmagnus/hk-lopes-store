import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase";

export const ACCESS_COOKIE_NAME = "hkls-access-token";
export const REFRESH_COOKIE_NAME = "hkls-refresh-token";

type AuthTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  user: {
    id: string;
    email?: string;
  };
};

type AuthUser = {
  id: string;
  email?: string;
};

async function authRequest<T>(path: string, init?: RequestInit) {
  const response = await fetch(`${getSupabaseUrl()}/auth/v1/${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      apikey: getSupabaseAnonKey(),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Supabase Auth request failed.");
  }

  return (await response.json()) as T;
}

export async function loginWithPassword(email: string, password: string) {
  return authRequest<AuthTokenResponse>("token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getAuthUser(accessToken: string) {
  try {
    return await authRequest<AuthUser>("user", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    return null;
  }
}

export async function setAuthCookies(session: AuthTokenResponse) {
  const cookieStore = await cookies();
  const secure = process.env.NODE_ENV === "production";
  const maxAge = Math.max(session.expires_in, 60 * 60);

  cookieStore.set(ACCESS_COOKIE_NAME, session.access_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge,
  });

  cookieStore.set(REFRESH_COOKIE_NAME, session.refresh_token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function clearAuthCookies() {
  const cookieStore = await cookies();

  cookieStore.delete(ACCESS_COOKIE_NAME);
  cookieStore.delete(REFRESH_COOKIE_NAME);
}

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    return null;
  }

  return getAuthUser(accessToken);
}

export async function requireAuthenticatedUser() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}
