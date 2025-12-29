"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Avatar,
  Box,
  Container,
  Divider,
  Paper,
  Typography,
} from "@mui/material";
import { getMembers } from "@/lib/members";
import { useProfiles } from "@/lib/useProfiles";

type Member = { email: string; name: string };

const normEmail = (s: string) => s.trim().toLowerCase();

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function ProfilesPage() {
  const members = useMemo<Member[]>(
    () => getMembers().map((m) => ({ ...m, email: normEmail(m.email) })),
    []
  );

  const { profiles } = useProfiles(members.map((m) => m.email));
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Page Title */}
      <Typography
        variant="h3"
        component="h1"
        align="center"
        sx={{
          fontWeight: 700,
          mb: 4,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Meet the Book Bros
      </Typography>

      {/* Three Members Inline */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          gap: { xs: 2, sm: 4, md: 6 },
          flexWrap: "wrap",
          mb: 4,
        }}
      >
        {members.map((m) => {
          const profile = profiles[m.email];
          const avatarUrl = profile?.avatar_url;
          const isSelected = selectedMember?.email === m.email;

          return (
            <Box
              key={m.email}
              onClick={() => setSelectedMember(m)}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                cursor: "pointer",
                transition: "transform 0.2s ease, opacity 0.2s ease",
                opacity: selectedMember && !isSelected ? 0.5 : 1,
                "&:hover": {
                  transform: "scale(1.05)",
                },
              }}
            >
              <Avatar
                src={avatarUrl || undefined}
                sx={{
                  width: 250,
                  height: 250,
                  fontSize: 80,
                  border: isSelected ? "4px solid #667eea" : "4px solid transparent",
                  boxShadow: isSelected
                    ? "0 8px 32px rgba(102, 126, 234, 0.4)"
                    : "0 4px 16px rgba(0,0,0,0.1)",
                  transition: "all 0.2s ease",
                }}
              >
                {!avatarUrl && getInitials(m.name)}
              </Avatar>
              <Typography
                variant="h5"
                component="h2"
                sx={{
                  mt: 2,
                  fontWeight: 600,
                  color: isSelected ? "primary.main" : "text.primary",
                }}
              >
                {m.name}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 4 }} />

      {/* Instructions Header */}
      <Typography
        variant="h6"
        align="center"
        sx={{ color: "text.secondary", mb: 4 }}
      >
        Click a user to see their stats
      </Typography>

      {/* Stats Section (placeholder) */}
      {selectedMember && (
        <Paper
          elevation={0}
          sx={{
            p: 4,
            backgroundColor: "grey.50",
            borderRadius: 2,
            minHeight: 200,
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 2 }}>
            {selectedMember.name}&apos;s Stats
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Stats coming soon...
          </Typography>
        </Paper>
      )}
    </Container>
  );
}
