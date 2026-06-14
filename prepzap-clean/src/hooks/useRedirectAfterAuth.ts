// src/hooks/useRedirectAfterAuth.ts
// Drop this hook into Login.tsx and Signup.tsx after successful auth.
//
// Usage:
//   const getRedirect = useRedirectAfterAuth();
//   // after signIn / signUp succeeds:
//   navigate(getRedirect());

import { useLocation } from "react-router-dom";

export function useRedirectAfterAuth(fallback = "/dashboard"): () => string {
  const { search } = useLocation();
  return () => {
    const params = new URLSearchParams(search);
    const redirect = params.get("redirect");
    // Only allow internal paths (must start with /)
    if (redirect && redirect.startsWith("/")) return redirect;
    return fallback;
  };
}
