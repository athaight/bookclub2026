"use client";

import { useEffect, useState, use } from "react";
import {
  Typography,
  Box,
  Chip,
  CircularProgress,
  Avatar,
  Breadcrumbs,
  Paper,
} from "@mui/material";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { BookReportRow, ProfileRow } from "@/types";
import { getMembers } from "@/lib/members";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function BookReportViewPage({ params }: PageProps) {
  const { id } = use(params);
  const [report, setReport] = useState<BookReportRow | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchReport() {
      const { data, error } = await supabase
        .from("book_reports")
        .select("*")
        .eq("id", id)
        .eq("status", "published")
        .single();

      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setReport(data);

      // Fetch author profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", data.user_email)
        .single();

      if (profileData) setProfile(profileData);
      setLoading(false);
    }
    fetchReport();
  }, [id]);

  // Calculate reading time (avg 200 words per minute)
  const getReadingTime = (content: string) => {
    const words = content.trim().split(/\s+/).length;
    const minutes = Math.ceil(words / 200);
    return minutes;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  // Get member name
  const getMemberName = (email: string) => {
    const members = getMembers();
    const member = members.find((m) => m.email === email);
    return profile?.display_name || member?.name || "Unknown";
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (notFound || !report) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h4" gutterBottom>
          Report Not Found
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This book report doesn&apos;t exist or hasn&apos;t been published yet.
        </Typography>
        <Box sx={{ mt: 3 }}>
          <Link href="/book-report" style={{ color: "inherit" }}>
            ← Back to Book Reports
          </Link>
        </Box>
      </Box>
    );
  }

  return (
    <>
      {/* Breadcrumb */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 3 }}
      >
        <Link
          href="/book-report"
          style={{ color: "inherit", textDecoration: "none" }}
        >
          <Typography
            color="text.secondary"
            sx={{ "&:hover": { textDecoration: "underline" } }}
          >
            Book Reports
          </Typography>
        </Link>
        <Typography color="text.primary">{report.title}</Typography>
      </Breadcrumbs>

      <Box sx={{ maxWidth: 800, mx: "auto" }}>
        {/* Header with book info */}
        <Paper elevation={0} sx={{ p: 3, mb: 4, bgcolor: "background.paper" }}>
          <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
            {/* Book Cover */}
            {report.book_cover_url ? (
              <Avatar
                src={report.book_cover_url}
                alt={`Cover of ${report.book_title}`}
                variant="rounded"
                sx={{
                  width: 120,
                  height: 180,
                  flexShrink: 0,
                }}
              />
            ) : (
              <Box
                sx={{
                  width: 120,
                  height: 180,
                  flexShrink: 0,
                  bgcolor: "grey.300",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography variant="caption" color="text.secondary">
                  No Cover
                </Typography>
              </Box>
            )}

            {/* Title and meta */}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
                {report.title}
              </Typography>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                {report.book_title}
              </Typography>
              {report.book_author && (
                <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                  by {report.book_author}
                </Typography>
              )}

              {/* Author info */}
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <Avatar
                  src={profile?.avatar_url || undefined}
                  alt={`Avatar of ${getMemberName(report.user_email)}`}
                  sx={{ width: 32, height: 32 }}
                >
                  {getMemberName(report.user_email)[0]}
                </Avatar>
                <Typography variant="body2">
                  {getMemberName(report.user_email)}
                </Typography>
              </Box>

              {/* Metrics */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <Chip
                  icon={<AccessTimeIcon />}
                  label={`${getReadingTime(report.content)} min read`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  icon={<CalendarTodayIcon />}
                  label={formatDate(report.updated_at)}
                  size="small"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Report Content */}
        <Box
          sx={{
            lineHeight: 1.8,
            fontSize: "1.1rem",
            "& p": { mb: 2 },
            whiteSpace: "pre-wrap",
          }}
        >
          <Typography variant="body1" component="div" sx={{ lineHeight: 1.8 }}>
            {report.content}
          </Typography>
        </Box>
      </Box>
    </>
  );
}
