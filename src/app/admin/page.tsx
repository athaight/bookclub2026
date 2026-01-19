"use client";

import { useEffect, useMemo, useState } from "react";
import { 
  Box, 
  Button, 
  CircularProgress, 
  Typography,
  Divider,
  Paper,
  Switch,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
} from "@mui/material";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import PersonIcon from "@mui/icons-material/Person";
import ArticleIcon from "@mui/icons-material/Article";
import SettingsIcon from "@mui/icons-material/Settings";
import NotificationsIcon from "@mui/icons-material/Notifications";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
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
  
  // Notification preferences state
  const [emailOnMention, setEmailOnMention] = useState(true);
  const [emailOnAllComments, setEmailOnAllComments] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [prefsMessage, setPrefsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  // Fetch notification preferences when authenticated
  useEffect(() => {
    if (!authedEmail) return;
    
    const fetchPrefs = async () => {
      setPrefsLoading(true);
      try {
        const response = await fetch(`/api/notifications/preferences?userEmail=${authedEmail}`);
        const data = await response.json();
        if (data.preferences) {
          setEmailOnMention(data.preferences.email_on_mention);
          setEmailOnAllComments(data.preferences.email_on_all_comments);
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
      } finally {
        setPrefsLoading(false);
      }
    };
    
    fetchPrefs();
  }, [authedEmail]);

  // Save notification preferences
  const handleSavePreferences = async () => {
    if (!authedEmail) return;
    
    setPrefsSaving(true);
    setPrefsMessage(null);
    
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: authedEmail,
          emailOnMention,
          emailOnAllComments,
        }),
      });
      
      if (response.ok) {
        setPrefsMessage({ type: 'success', text: 'Preferences saved successfully!' });
        setTimeout(() => setPrefsMessage(null), 3000);
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      setPrefsMessage({ type: 'error', text: 'Failed to save preferences. Please try again.' });
    } finally {
      setPrefsSaving(false);
    }
  };

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
          Admin
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

      {/* Settings Section */}
      <Divider sx={{ my: 6, width: "100%", maxWidth: 600 }} />
      
      <Box sx={{ width: "100%", maxWidth: 600 }}>
        <Typography
          variant="h5"
          sx={{
            fontWeight: 700,
            mb: 3,
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          <SettingsIcon /> Settings
        </Typography>

        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <NotificationsIcon color="primary" />
              <Typography variant="h6">Notifications</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Paper sx={{ p: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Control how you receive notifications about comments on Book of the Month.
              </Typography>

              {prefsLoading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={emailOnMention}
                        onChange={(e) => setEmailOnMention(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          Email when mentioned
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Receive an email when someone @mentions you in a comment
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", ml: 0 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={emailOnAllComments}
                        onChange={(e) => setEmailOnAllComments(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body1" fontWeight={500}>
                          All comments
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Receive an email for every new comment on the Book of the Month
                        </Typography>
                      </Box>
                    }
                    sx={{ alignItems: "flex-start", ml: 0 }}
                  />

                  {prefsMessage && (
                    <Alert severity={prefsMessage.type} sx={{ mt: 1 }}>
                      {prefsMessage.text}
                    </Alert>
                  )}

                  <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 2 }}>
                    <Button
                      variant="contained"
                      onClick={handleSavePreferences}
                      disabled={prefsSaving}
                      sx={{
                        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                        "&:hover": {
                          background: "linear-gradient(135deg, #5a6fd6 0%, #6a4190 100%)",
                        },
                      }}
                    >
                      {prefsSaving ? <CircularProgress size={20} color="inherit" /> : "Save Preferences"}
                    </Button>
                  </Box>
                </Box>
              )}
            </Paper>
          </AccordionDetails>
        </Accordion>
      </Box>
    </Box>
  );
}
