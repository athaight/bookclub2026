"use client";

import { useState } from "react";
import { Box, Button, Card, CardContent, TextField, Typography } from "@mui/material";
import { supabase } from "@/lib/supabaseClient";

export default function WelcomeLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setLoading(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      setMsg(error.message);
      setLoading(false);
      return;
    }

    // confirm session exists before redirect
    const { data } = await supabase.auth.getSession();
    if (!data.session) {
      setMsg("Logged in, but session didn't load. Refresh and try again.");
      setLoading(false);
      return;
    }

    window.location.href = "/welcome";
  }

  return (
    <Box sx={{ maxWidth: 420, mx: "auto", mt: 6 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        BBBC Bro Login
      </Typography>

      <Card>
        <CardContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            fullWidth
          />
          <TextField
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            fullWidth
          />

          <Button
            variant="contained"
            onClick={onLogin}
            disabled={loading || !email.trim() || !password}
          >
            {loading ? "Logging in..." : "Log in"}
          </Button>

          {msg && (
            <Typography color="error" variant="body2" role="alert">
              {msg}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
