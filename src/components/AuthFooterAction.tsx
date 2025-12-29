"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@mui/material";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  loginHref?: string; // default: /admin/login
};

export default function AuthFooterAction({ loginHref = "/admin/login" }: Props) {
  const [loading, setLoading] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      setIsAuthed(!!data.session);
      setLoading(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      setIsAuthed(!!session);
      setLoading(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <Button size="small" disabled>
        …
      </Button>
    );
  }

  if (!isAuthed) {
    return (
      <Button size="small" component={Link} href={loginHref} variant="text">
        Log in
      </Button>
    );
  }

  return (
    <Button
      size="small"
      variant="text"
      onClick={async () => {
        await supabase.auth.signOut({ scope: 'local' });
        // optional: if they're on /admin, bounce them to home after logout
        if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
          window.location.href = "/";
        }
      }}
    >
      Log out
    </Button>
  );
}
