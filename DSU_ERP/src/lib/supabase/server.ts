import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function supabaseServer() {
  const store = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Campus authentication is not configured.");
  return createServerClient(url, key, {
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    },
    cookies: {
      getAll: () => store.getAll(),
      setAll: (values) => {
        // Server Actions and the proxy can update cookies; Server Components cannot.
        try {
          for (const { name, value, options } of values)
            store.set(name, value, options);
        } catch {}
      },
    },
  });
}
