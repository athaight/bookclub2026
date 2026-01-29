"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Box, Button } from "@mui/material";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  loginHref?: string; // default: /welcome/login
};

export default function AuthFooterAction({ loginHref = "/welcome/login" }: Props) {
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
    <Box sx={{ display: "flex", gap: 1 }}>
      <Button size="small" component={Link} href="/admin" variant="text">
        Admin
      </Button>
      <Button
        size="small"
        variant="text"
        onClick={async () => {
          await supabase.auth.signOut({ scope: 'local' });
          // Bounce to home if on admin or welcome page
          if (typeof window !== "undefined" && 
              (window.location.pathname.startsWith("/admin") || 
               window.location.pathname.startsWith("/welcome"))) {
            window.location.href = "/";
          }
        }}
      >
        Log out
      </Button>
    </Box>
  );
}
