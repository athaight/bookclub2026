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
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import MobileNav from "@/components/MobileNav";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { BookRow } from "@/types";

const normEmail = (s: string) => s.trim().toLowerCase();

export default function TopTensPage() {
  const members = getMembers().map((m) => ({ ...m, email: normEmail(m.email) }));
  const [topTenBooks, setTopTenBooks] = useState<Record<string, BookRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  // Form state for adding books
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formTitle, setFormTitle] = useState("");
  const [formAuthor, setFormAuthor] = useState("");
  const [formComment, setFormComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchTopTenBooks() {
      const { data, error } = await supabase
        .from("books")
        .select("*")
        .eq("top_ten", true)
        .in("member_email", members.map((m) => m.email))
        .order("created_at", { ascending: false });

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

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ? normEmail(data.session.user.email) : null;

      if (!mounted) return;

      if (email) {
        const allowed = members.some((m) => m.email === email);
        if (!allowed) {
          setAuthedEmail(null);
        } else {
          setAuthedEmail(email);
        }
      } else {
        setAuthedEmail(null);
      }

      setCheckingSession(false);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const email = session?.user?.email ? normEmail(session.user.email) : null;
      if (email) {
        const allowed = members.some((m) => m.email === email);
        if (!allowed) {
          setAuthedEmail(null);
        } else {
          setAuthedEmail(email);
        }
      } else {
        setAuthedEmail(null);
      }
      setCheckingSession(false);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [members]);

  const handleAddBook = async () => {
    if (!authedEmail) return;

    const title = formTitle.trim();
    const author = formAuthor.trim();
    const comment = formComment.trim();

    if (!title) {
      alert("Title is required.");
      return;
    }

    // Check if user already has 10 books
    const userBooks = topTenBooks[authedEmail] || [];
    if (userBooks.length >= 10) {
      alert("You can only have 10 books in your top ten list.");
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.from("books").insert({
        member_email: authedEmail,
        status: "completed",
        title,
        author: author || "",
        comment: comment || "",
        top_ten: true,
        // Don't set completed_at for top ten books - they're not reading completions
      });

      if (error) throw new Error(error.message);

      // Reset form
      setFormTitle("");
      setFormAuthor("");
      setFormComment("");
      setDialogOpen(false);

      // Refresh the data
      const { data } = await supabase
        .from("books")
        .select("*")
        .eq("top_ten", true)
        .in("member_email", members.map((m) => m.email))
        .order("created_at", { ascending: false });

      const grouped: Record<string, BookRow[]> = {};
      members.forEach((member) => {
        grouped[member.email] = data
          ?.filter((book) => book.member_email === member.email)
          .slice(0, 10) || [];
      });

      setTopTenBooks(grouped);
    } catch (e) {
      alert(`Error saving book: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading || checkingSession) {
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
        {process.env.NODE_ENV === 'development' && (
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
            Debug: Auth email: {authedEmail || 'none'}
          </Typography>
        )}
      </Box>

      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
        {members.map((member) => (
          <Box key={member.email} sx={{ flex: 1 }}>
            <Card sx={{ height: '100%' }}>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="h5" component="h2" sx={{ textAlign: 'center', flex: 1 }}>
                    {member.name}&apos;s Top 10
                  </Typography>
                  {authedEmail === member.email && (
                    <IconButton
                      onClick={() => setDialogOpen(true)}
                      size="small"
                      sx={{ ml: 1 }}
                      disabled={(topTenBooks[member.email]?.length || 0) >= 10}
                    >
                      <EditIcon />
                    </IconButton>
                  )}
                </Box>
                <Divider sx={{ mb: 2 }} />

                {topTenBooks[member.email]?.length > 0 ? (
                  <List>
                    {topTenBooks[member.email].map((book, index) => (
                      <ListItem key={book.id} sx={{ px: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
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
                        {book.comment && (
                          <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary', pl: 3 }}>
                            {book.comment}
                          </Typography>
                        )}
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add to Your Top Ten</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Book Title"
            fullWidth
            variant="outlined"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Author (optional)"
            fullWidth
            variant="outlined"
            value={formAuthor}
            onChange={(e) => setFormAuthor(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="Why did you choose this book?"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={formComment}
            onChange={(e) => setFormComment(e.target.value)}
            helperText="Share your thoughts about why this book made your top ten"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleAddBook} variant="contained" disabled={saving}>
            {saving ? "Saving..." : "Add to Top Ten"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
