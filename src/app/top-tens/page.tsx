"use client";

import { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
} from "@mui/material";
import MobileNav from "@/components/MobileNav";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { BookRow } from "@/types";

type Member = { email: string; name: string };

const normEmail = (s: string) => s.trim().toLowerCase();

export default function TopTensPage() {
  const members = getMembers().map((m) => ({ ...m, email: normEmail(m.email) }));
  const [topTenBooks, setTopTenBooks] = useState<Record<string, BookRow[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTopTenBooks() {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("top_ten", true)
        .in("member_email", members.map((m) => m.email))
        .order("completed_at", { ascending: false });

      if (error) {
        console.error("Error fetching top ten books:", error);
        setLoading(false);
        return;
      }

      // Group books by member email and take only the first 10 for each
      const grouped: Record<string, BookRow[]> = {};
      members.forEach((member) => {
        grouped[member.email] = data
          ?.filter((book) => book.member_email === member.email)
          .slice(0, 10) || [];
      });

      setTopTenBooks(grouped);
      setLoading(false);
    }

    fetchTopTenBooks();
  }, [members]);

  if (loading) {
    return (
      <>
        <MobileNav />
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Typography variant="h6">Loading top ten lists...</Typography>
        </Box>
      </>
    );
  }

  return (
    <>
      <MobileNav />
      <Box sx={{ textAlign: 'center', mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Our Top Tens
        </Typography>
        <Typography variant="h6" component="p" sx={{ mb: 2 }}>
          The books that made our lists
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {members.map((member) => (
          <Box key={member.email} sx={{ flex: 1 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Typography variant="h5" component="h2" gutterBottom sx={{ textAlign: 'center' }}>
                  {member.name}'s Top 10
                </Typography>
                <Divider sx={{ mb: 2 }} />

                {topTenBooks[member.email]?.length > 0 ? (
                  <List>
                    {topTenBooks[member.email].map((book, index) => (
                      <ListItem key={book.id} sx={{ px: 0 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body1" component="span">
                              <Box component="span" sx={{ fontWeight: 'bold', mr: 1 }}>
                                {index + 1}.
                              </Box>
                              {book.title || "Untitled"}
                            </Typography>
                          }
                          secondary={book.author ? `by ${book.author}` : null}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" sx={{ textAlign: 'center', fontStyle: 'italic', color: 'text.secondary' }}>
                    No books in top ten yet
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Box>
        ))}
      </Box>
    </>
  );
}
