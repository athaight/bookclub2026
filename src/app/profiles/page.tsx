"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Avatar,
  Box,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  Typography,
} from "@mui/material";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import { getMembers } from "@/lib/members";
import { useProfiles } from "@/lib/useProfiles";
import { supabase } from "@/lib/supabaseClient";
import { BookRow } from "@/types";

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
  const [memberBooks, setMemberBooks] = useState<Record<string, BookRow[]>>({});
  const [loading, setLoading] = useState(false);

  // Fetch all books for all members
  useEffect(() => {
    async function fetchBooks() {
      setLoading(true);
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .in("member_email", members.map((m) => m.email));

      if (!error && data) {
        const grouped: Record<string, BookRow[]> = {};
        for (const m of members) {
          grouped[m.email] = data.filter((b) => b.member_email === m.email);
        }
        setMemberBooks(grouped);
      }
      setLoading(false);
    }

    if (members.length > 0) {
      fetchBooks();
    }
  }, [members]);

  // Calculate stats for selected member
  const stats = useMemo(() => {
    if (!selectedMember) return null;

    const books = memberBooks[selectedMember.email] || [];
    
    // Reading Challenge stats (2026)
    const challengeBooks = books.filter((b) => b.reading_challenge_year === 2026);
    const currentBooks = challengeBooks.filter((b) => b.status === "current");
    const completedChallengeBooks = challengeBooks.filter((b) => b.status === "completed");
    
    // Calculate monthly reading stats
    const monthlyData = Array(12).fill(0);
    for (const book of completedChallengeBooks) {
      if (book.completed_at) {
        const completedDate = new Date(book.completed_at);
        // Only count books completed in 2026
        if (completedDate.getFullYear() === 2026) {
          const month = completedDate.getMonth(); // 0-11
          monthlyData[month]++;
        }
      }
    }
    
    // Calculate ranking across all members
    const memberScores = members.map((m) => {
      const mBooks = memberBooks[m.email] || [];
      const mChallengeBooks = mBooks.filter((b) => b.reading_challenge_year === 2026 && b.status === "completed");
      return { email: m.email, completedCount: mChallengeBooks.length };
    }).sort((a, b) => b.completedCount - a.completedCount);
    
    const rankIndex = memberScores.findIndex((s) => s.email === selectedMember.email);
    const rankLabel = rankIndex === 0 ? "Bibliophile" : rankIndex === 1 ? "Bookworm" : "Bookish";
    
    // Library stats
    const libraryBooks = books.filter((b) => b.in_library);
    
    // Genre counts
    const genreCounts: Record<string, number> = {};
    for (const book of libraryBooks) {
      if (book.genre) {
        genreCounts[book.genre] = (genreCounts[book.genre] || 0) + 1;
      }
    }
    
    // Sort genres by count
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10); // Top 10 genres

    return {
      currentBooks,
      booksRead: completedChallengeBooks.length,
      rankLabel,
      monthlyData,
      totalLibraryBooks: libraryBooks.length,
      genres: sortedGenres,
    };
  }, [selectedMember, memberBooks, members]);

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
                  width: { xs: 120, sm: 180, md: 250 },
                  height: { xs: 120, sm: 180, md: 250 },
                  fontSize: { xs: 40, sm: 60, md: 80 },
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
                  fontSize: { xs: "1.1rem", sm: "1.5rem" },
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
      {!selectedMember && (
        <Typography
          variant="h6"
          align="center"
          sx={{ color: "text.secondary", mb: 4 }}
        >
          Click a user to see their stats
        </Typography>
      )}

      {/* Stats Section */}
      {selectedMember && stats && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {/* Reading Challenge Card */}
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                <MenuBookIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  2026 Reading Challenge
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                Current ranking:
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
                {stats.rankLabel}
              </Typography>
              
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                }}
              >
                {/* Current Book */}
                <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                  {stats.currentBooks.length > 0 ? (
                    <>
                      <Typography variant="body2" color="text.secondary">
                        Currently Reading ({stats.currentBooks.length})
                      </Typography>
                      {stats.currentBooks.map((book) => (
                        <Box key={book.id} sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                          {book.cover_url && (
                            <Avatar
                              src={book.cover_url}
                              variant="rounded"
                              sx={{ width: 50, height: 75, flexShrink: 0 }}
                            />
                          )}
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                              {book.title}
                            </Typography>
                            {book.author && (
                              <Typography variant="body2" color="text.secondary">
                                by {book.author}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      ))}
                    </>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      No current book
                    </Typography>
                  )}
                </Box>

                {/* Vertical Divider */}
                <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />

                {/* Books Read Count */}
                <Box sx={{ textAlign: "center", minWidth: 100 }}>
                  <Typography
                    variant="h2"
                    sx={{
                      fontWeight: 700,
                      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      backgroundClip: "text",
                      WebkitBackgroundClip: "text",
                      WebkitTextFillColor: "transparent",
                    }}
                  >
                    {stats.booksRead}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    books read
                  </Typography>
                </Box>
              </Box>

              {/* Monthly Reading Chart */}
              <Divider sx={{ my: 3 }} />
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                Books Completed by Month
              </Typography>
              <Box sx={{ width: "100%", height: 250 }}>
                <BarChart
                  xAxis={[
                    {
                      scaleType: "band",
                      data: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
                    },
                  ]}
                  series={[
                    {
                      data: stats.monthlyData,
                      color: "#667eea",
                    },
                  ]}
                  height={250}
                  margin={{ top: 20, bottom: 30, left: 40, right: 20 }}
                />
              </Box>
            </CardContent>
          </Card>

          {/* Library Stats Card */}
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
                <LibraryBooksIcon color="primary" />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Library Stats
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total Books
                </Typography>
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 700,
                    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                    backgroundClip: "text",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {stats.totalLibraryBooks}
                </Typography>
              </Box>

              {/* Genre Pie Chart */}
              {stats.genres.length > 0 && (
                <Box sx={{ mb: "24px" }}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Genre Distribution
                  </Typography>
                  
                  {/* Pie Chart - centered, no legend */}
                  <Box sx={{ width: "100%", height: 200, display: "flex", justifyContent: "center" }}>
                    <PieChart
                      series={[
                        {
                          data: stats.genres.map(([genre, count], index) => ({
                            id: index,
                            value: count,
                          })),
                          innerRadius: 25,
                          outerRadius: 80,
                          paddingAngle: 2,
                          cornerRadius: 5,
                        },
                      ]}
                      width={200}
                      height={200}
                    />
                  </Box>
                  
                  {/* Custom Legend - wraps naturally */}
                  <Box 
                    sx={{ 
                      display: "flex", 
                      flexWrap: "wrap", 
                      gap: 1,
                      justifyContent: "center",
                      mt: "24px",
                    }}
                  >
                    {stats.genres.map(([genre, count], index) => {
                      const colors = [
                        "#02b2af", "#2e96ff", "#b800d8", "#60009b", "#2731c8",
                        "#03008d", "#ff6f00", "#4caf50", "#f44336", "#9c27b0"
                      ];
                      return (
                        <Box 
                          key={genre} 
                          sx={{ 
                            display: "flex", 
                            alignItems: "center", 
                            gap: 0.5,
                            px: 1,
                            py: 0.5,
                          }}
                        >
                          <Box 
                            sx={{ 
                              width: 12, 
                              height: 12, 
                              borderRadius: "50%", 
                              backgroundColor: colors[index % colors.length],
                              flexShrink: 0,
                            }} 
                          />
                          <Typography variant="body2" sx={{ fontSize: 12 }}>
                            {genre} ({count})
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {/* Genre Chips */}
              {/* Genre Chips removed: legend now shows the count */}

              {stats.genres.length === 0 && (
                <Typography variant="body2" color="text.secondary">
                  No genre data available yet. Genres are captured when new books are added.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {loading && selectedMember && (
        <Typography align="center" color="text.secondary">
          Loading stats...
        </Typography>
      )}
    </Container>
  );
}
