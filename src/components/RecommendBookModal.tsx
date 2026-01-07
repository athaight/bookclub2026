"use client";

import { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  CircularProgress,
  Avatar,
  Alert,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { useProfiles } from "@/lib/useProfiles";

const normEmail = (s: string) => s.trim().toLowerCase();

type BookData = {
  title: string;
  author?: string | null;
  cover_url?: string | null;
  genre?: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  book: BookData | null;
  fromEmail: string;
  onSuccess?: () => void;
};

export default function RecommendBookModal({
  open,
  onClose,
  book,
  fromEmail,
  onSuccess,
}: Props) {
  const members = getMembers().map((m) => ({
    ...m,
    email: normEmail(m.email),
  }));
  const otherMembers = members.filter((m) => m.email !== normEmail(fromEmail));
  const { profiles } = useProfiles(otherMembers.map((m) => m.email));

  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleToggle(email: string) {
    setSelectedEmails((prev) =>
      prev.includes(email)
        ? prev.filter((e) => e !== email)
        : [...prev, email]
    );
  }

  function handleClose() {
    setSelectedEmails([]);
    setMessage("");
    setError(null);
    setSuccess(false);
    onClose();
  }

  async function handleSend() {
    if (!book || selectedEmails.length === 0) return;

    setSending(true);
    setError(null);

    try {
      const recommendations = selectedEmails.map((toEmail) => ({
        from_email: normEmail(fromEmail),
        to_email: toEmail,
        book_title: book.title,
        book_author: book.author || null,
        book_cover_url: book.cover_url || null,
        book_genre: book.genre || null,
        message: message.trim() || null,
        status: "pending",
      }));

      const { error: insertError } = await supabase
        .from("book_recommendations")
        .insert(recommendations);

      if (insertError) throw insertError;

      setSuccess(true);
      setTimeout(() => {
        handleClose();
        onSuccess?.();
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send recommendation");
    } finally {
      setSending(false);
    }
  }

  function getDisplayName(email: string): string {
    const profile = profiles[email];
    if (profile?.display_name) return profile.display_name;
    const member = members.find((m) => m.email === email);
    return member?.name || email;
  }

  function getAvatarUrl(email: string): string | undefined {
    return profiles[email]?.avatar_url || undefined;
  }

  if (!book) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Recommend Book</DialogTitle>
      <DialogContent>
        {/* Book info */}
        <Box sx={{ display: "flex", gap: 2, mb: 3, mt: 1 }}>
          {book.cover_url && (
            <Box
              component="img"
              src={book.cover_url}
              alt={`Cover of ${book.title}`}
              sx={{ width: 60, height: 90, objectFit: "cover", borderRadius: 1 }}
            />
          )}
          <Box>
            <Typography variant="subtitle1" fontWeight={600}>
              {book.title}
            </Typography>
            {book.author && (
              <Typography variant="body2" color="text.secondary">
                by {book.author}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Member selection */}
        <Typography variant="subtitle2" sx={{ mb: 1 }}>
          Recommend to:
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mb: 2 }}>
          {otherMembers.map((member) => (
            <FormControlLabel
              key={member.email}
              control={
                <Checkbox
                  checked={selectedEmails.includes(member.email)}
                  onChange={() => handleToggle(member.email)}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Avatar
                    src={getAvatarUrl(member.email)}
                    alt={`${getDisplayName(member.email)}'s avatar`}
                    sx={{ width: 28, height: 28 }}
                  >
                    {getDisplayName(member.email).charAt(0).toUpperCase()}
                  </Avatar>
                  <Typography>{getDisplayName(member.email)}</Typography>
                </Box>
              }
            />
          ))}
        </Box>

        {/* Message */}
        <TextField
          label="Why I'm recommending this book (optional)"
          multiline
          rows={3}
          fullWidth
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="I think you'd love this because..."
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            Recommendation sent!
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={sending}>
          Cancel
        </Button>
        <Button
          onClick={handleSend}
          variant="contained"
          disabled={sending || selectedEmails.length === 0 || success}
          startIcon={sending ? <CircularProgress size={16} /> : <SendIcon />}
        >
          {sending ? "Sending..." : "Send Recommendation"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
