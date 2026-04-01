const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function getSupabaseUrl() {
  if (!SUPABASE_URL) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing.");
  }

  return SUPABASE_URL;
}

export function getSupabaseAnonKey() {
  if (!SUPABASE_ANON_KEY) {
    throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.");
  }

  return SUPABASE_ANON_KEY;
}

function buildHeaders(prefer?: string) {
  const anonKey = getSupabaseAnonKey();

  return {
    "Content-Type": "application/json",
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

export async function supabaseRequest<T>(
  path: string,
  init?: RequestInit & { prefer?: string }
) {
  const response = await fetch(`${getSupabaseUrl()}/rest/v1/${path}`, {
    ...init,
    headers: {
      ...buildHeaders(init?.prefer),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const raw = await response.text();

  if (!raw) {
    if (!response.ok) {
      throw new Error(`Supabase request failed with status ${response.status}.`);
    }

    return null as T;
  }

  try {
    const parsed = JSON.parse(raw) as T;

    if (!response.ok) {
      const message =
        typeof parsed === "object" && parsed !== null && "message" in parsed
          ? String((parsed as { message?: unknown }).message ?? "")
          : "";

      throw new Error(message || `Supabase request failed with status ${response.status}.`);
    }

    return parsed;
  } catch {
    if (!response.ok) {
      throw new Error(raw || `Supabase request failed with status ${response.status}.`);
    }

    return null as T;
  }
}
