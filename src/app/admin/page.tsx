"use client";

import { useEffect, useMemo, useState } from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import PersonIcon from "@mui/icons-material/Person";
import ArticleIcon from "@mui/icons-material/Article";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";

type Member = { email: string; name: string };

const normEmail = (s: string) => s.trim().toLowerCase();

export default function AdminPage() {
  const router = useRouter();
  const members = useMemo<Member[]>(
    () => getMembers().map((m) => ({ ...m, email: normEmail(m.email) })),
    []
  );

  const [checkingSession, setCheckingSession] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ? normEmail(data.session.user.email) : null;

      if (!mounted) return;

      if (!email) {
        setCheckingSession(false);
        window.location.href = "/admin/login";
        return;
      }

      const member = members.find((m) => m.email === email);
      if (!member) {
        await supabase.auth.signOut({ scope: 'local' });
        setCheckingSession(false);
        window.location.href = "/admin/login";
        return;
      }

      setAuthedEmail(email);
      setUserName(member.name);
      setCheckingSession(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const email = session?.user?.email ? normEmail(session.user.email) : null;
      if (!email) {
        window.location.href = "/admin/login";
        return;
      }
      const member = members.find((m) => m.email === email);
      setAuthedEmail(email);
      setUserName(member?.name || "");
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [members]);

  if (checkingSession) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography>Loading...</Typography>
      </Box>
    );
  }

  if (!authedEmail) return null;

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "70vh",
        textAlign: "center",
        px: 3,
      }}
    >
      {/* Hero Section */}
      <Typography
        variant="h3"
        component="h1"
        sx={{
          fontWeight: 800,
          mb: 2,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Welcome {userName} to your book club, book bro!
      </Typography>

      <Typography
        variant="h6"
        sx={{
          color: "text.secondary",
          mb: 5,
          maxWidth: 500,
        }}
      >
        You&apos;re logged in as an admin for {userName}
      </Typography>

      {/* Action Buttons */}
      <Box
        sx={{
          display: "flex",
          gap: 3,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <Button
          variant="contained"
          size="large"
          startIcon={<AutoStoriesIcon />}
          onClick={() => router.push("/reading-challenge")}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: "1.1rem",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            "&:hover": {
              background: "linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)",
            },
          }}
        >
          Enter
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<PersonIcon />}
          onClick={() => router.push("/profile")}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: "1.1rem",
            borderColor: "#667eea",
            color: "#667eea",
            "&:hover": {
              borderColor: "#764ba2",
              backgroundColor: "rgba(102, 126, 234, 0.04)",
            },
          }}
        >
          Profile
        </Button>

        <Button
          variant="outlined"
          size="large"
          startIcon={<ArticleIcon />}
          onClick={() => router.push("/book-report")}
          sx={{
            px: 4,
            py: 1.5,
            fontSize: "1.1rem",
            borderColor: "#667eea",
            color: "#667eea",
            "&:hover": {
              borderColor: "#764ba2",
              backgroundColor: "rgba(102, 126, 234, 0.04)",
            },
          }}
        >
          Book Reports
        </Button>
      </Box>
    </Box>
  );
}
