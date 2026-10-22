import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {authConfiguration} from "@/shared/config/env";

export async function supabaseServer() {
  const store = await cookies();
  const {url,key}=authConfiguration();
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
