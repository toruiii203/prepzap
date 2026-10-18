import React, { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * Smart redirector for legacy /community URLs:
 * - /community?tab=vault -> /campus-vault
 * - /community -> /friends
 */
export default function Community() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab === "vault") {
      navigate("/campus-vault", { replace: true });
    } else {
      navigate("/friends", { replace: true });
    }
  }, [navigate, searchParams]);

  return null;
}
