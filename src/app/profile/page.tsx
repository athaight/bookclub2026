"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
  Alert,
  IconButton,
  Divider,
  Switch,
  FormControlLabel,
  Snackbar,
} from "@mui/material";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import SaveIcon from "@mui/icons-material/Save";
import LogoutIcon from "@mui/icons-material/Logout";
import AutoStoriesIcon from "@mui/icons-material/AutoStories";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { supabase } from "@/lib/supabaseClient";
import { getMembers } from "@/lib/members";
import { ProfileRow } from "@/types";
import BookDiscoveryModal from "@/components/BookDiscoveryModal";

const normEmail = (s: string) => s.trim().toLowerCase();

export default function ProfilePage() {
  const router = useRouter();
  const members = useMemo(() => getMembers().map((m) => ({ ...m, email: normEmail(m.email) })), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authedEmail, setAuthedEmail] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [discoveryModalOpen, setDiscoveryModalOpen] = useState(false);
  
  // Notification preferences state
  const [emailOnMention, setEmailOnMention] = useState(true);
  const [emailOnAllComments, setEmailOnAllComments] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const [prefsSaving, setPrefsSaving] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      const email = data.session?.user?.email ? normEmail(data.session.user.email) : null;

      if (!mounted) return;

      if (!email) {
        router.push("/admin/login");
        return;
      }

      const allowed = members.some((m) => m.email === email);
      if (!allowed) {
        await supabase.auth.signOut({ scope: "local" });
        router.push("/admin/login");
        return;
      }

      setAuthedEmail(email);

      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("email", email)
        .single();

      if (profileError && profileError.code !== "PGRST116") {
        // PGRST116 = no rows returned
        setError("Error loading profile");
        setLoading(false);
        return;
      }

      if (profileData) {
        setProfile(profileData);
        setDisplayName(profileData.display_name || "");
        setAvatarUrl(profileData.avatar_url || null);
      } else {
        // Use member name as default
        const member = members.find((m) => m.email === email);
        setDisplayName(member?.name || "");
      }

      setLoading(false);
      
      // Fetch notification preferences
      setPrefsLoading(true);
      try {
        const prefsResponse = await fetch(`/api/notifications/preferences?userEmail=${email}`);
        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          if (prefsData.preferences) {
            setEmailOnMention(prefsData.preferences.email_on_mention);
            setEmailOnAllComments(prefsData.preferences.email_on_all_comments);
          }
        }
      } catch (err) {
        console.error('Error fetching notification preferences:', err);
      } finally {
        setPrefsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router, members]);

  async function handleSave() {
    if (!authedEmail) return;

    const name = displayName.trim();
    if (!name) {
      setError("Display name is required.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const profileData = {
        email: authedEmail,
        display_name: name,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      };

      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from("profiles")
          .update(profileData)
          .eq("email", authedEmail);

        if (error) throw new Error(error.message);
      } else {
        // Insert new profile
        const { error } = await supabase.from("profiles").insert({
          ...profileData,
          created_at: new Date().toISOString(),
        });

        if (error) throw new Error(error.message);
      }

      setSuccess("Profile saved successfully!");
      setProfile({ ...profileData, created_at: profile?.created_at || new Date().toISOString() } as ProfileRow);
    } catch (e) {
      setError(`Error saving profile: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarUpload(event: React.ChangeEvent<HTMLInputElement>) {
    if (!event.target.files || event.target.files.length === 0 || !authedEmail) {
      return;
    }

    const file = event.target.files[0];
    const fileExt = file.name.split(".").pop();
    const fileName = `${authedEmail.replace(/[^a-z0-9]/g, "_")}_${Date.now()}.${fileExt}`;

    setUploading(true);
    setError(null);

    try {
      // Upload file to Supabase Storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw new Error(uploadError.message);

      // Get public URL
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(fileName);
      const newAvatarUrl = urlData.publicUrl;

      console.log("[DEBUG] Avatar upload:", { fileName, uploadData, newAvatarUrl });

      setAvatarUrl(newAvatarUrl);

      // Auto-save the avatar URL to the profile
      const profileData = {
        email: authedEmail,
        display_name: displayName.trim() || authedEmail,
        avatar_url: newAvatarUrl,
        updated_at: new Date().toISOString(),
      };

      if (profile) {
        const { error: saveError } = await supabase
          .from("profiles")
          .update({ avatar_url: newAvatarUrl, updated_at: new Date().toISOString() })
          .eq("email", authedEmail);
        if (saveError) throw new Error(saveError.message);
      } else {
        const { error: saveError } = await supabase.from("profiles").insert({
          ...profileData,
          created_at: new Date().toISOString(),
        });
        if (saveError) throw new Error(saveError.message);
        setProfile(profileData as ProfileRow);
      }

      setSuccess("Profile picture updated!");
    } catch (e) {
      setError(`Error uploading image: ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut({ scope: "local" });
    router.push("/");
  }

  async function handleSaveNotificationPrefs() {
    if (!authedEmail) return;
    
    setPrefsSaving(true);
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
        setSnackbarOpen(true);
      } else {
        setError('Failed to save notification preferences');
      }
    } catch (err) {
      setError('Failed to save notification preferences');
    } finally {
      setPrefsSaving(false);
    }
  }

  if (loading) {
    return (
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading profile...
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h3" component="h1" gutterBottom>
          Admin
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Manage your admin settings
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 500, mx: "auto" }}>
        {/* Book Discovery Button - Prominent placement */}
        <Box sx={{ mb: 3 }}>
          <Button
            variant="contained"
            color="secondary"
            size="large"
            fullWidth
            startIcon={<AutoStoriesIcon />}
            onClick={() => setDiscoveryModalOpen(true)}
            sx={{
              py: 1.5,
              fontSize: '1.1rem',
              fontWeight: 'bold',
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            }}
          >
            📚 Discover Your Next Book
          </Button>
        </Box>

        <Card>
          <CardContent sx={{ display: "flex", flexDirection: "column", gap: 3, p: 3 }}>
            {/* Avatar Section */}
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
              <Box sx={{ position: "relative" }}>
                <Avatar
                  src={avatarUrl || undefined}
                  alt={`Profile picture of ${displayName || 'user'}`}
                  sx={{ width: 120, height: 120, fontSize: 48 }}
                >
                  {displayName ? displayName[0].toUpperCase() : "?"}
                </Avatar>
                <IconButton
                  component="label"
                  sx={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    bgcolor: "primary.main",
                    color: "white",
                    "&:hover": { bgcolor: "primary.dark" },
                  }}
                  size="small"
                  disabled={uploading}
                >
                  {uploading ? <CircularProgress size={20} color="inherit" /> : <PhotoCameraIcon fontSize="small" />}
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </IconButton>
              </Box>
              <Typography variant="caption" color="text.secondary">
                Click the camera icon to upload a photo
              </Typography>
            </Box>

            {/* Error/Success Messages */}
            {error && <Alert severity="error">{error}</Alert>}
            {success && <Alert severity="success">{success}</Alert>}

            {/* Email (read-only) */}
            <TextField
              label="Email"
              value={authedEmail || ""}
              disabled
              fullWidth
              helperText="Email cannot be changed"
            />

            {/* Display Name */}
            <TextField
              label="Display Name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              fullWidth
              required
              helperText="This is how your name appears on the site"
            />

            {/* Save Button */}
            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSave}
              disabled={saving}
              size="large"
            >
              {saving ? "Saving..." : "Save Profile"}
            </Button>

            {/* Logout Button */}
            <Button
              variant="outlined"
              color="error"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              size="large"
            >
              Log Out
            </Button>

            {/* Notification Settings */}
            <Divider sx={{ my: 2 }} />
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <NotificationsIcon color="primary" />
              <Typography variant="h6" fontWeight={600}>
                Notification Settings
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Control how you receive notifications about comments on Book of the Month.
            </Typography>

            {prefsLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
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
                      <Typography variant="body2" fontWeight={500}>
                        Email when mentioned
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Get an email when someone @mentions you
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', ml: 0 }}
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
                      <Typography variant="body2" fontWeight={500}>
                        All comments
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Get an email for every new comment
                      </Typography>
                    </Box>
                  }
                  sx={{ alignItems: 'flex-start', ml: 0 }}
                />

                <Button
                  variant="contained"
                  onClick={handleSaveNotificationPrefs}
                  disabled={prefsSaving}
                  size="small"
                  sx={{ alignSelf: 'flex-start', mt: 1 }}
                >
                  {prefsSaving ? 'Saving...' : 'Save Notifications'}
                </Button>
              </Box>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Book Discovery Modal */}
      {authedEmail && (
        <BookDiscoveryModal
          open={discoveryModalOpen}
          onClose={() => setDiscoveryModalOpen(false)}
          userEmail={authedEmail}
        />
      )}

      {/* Settings Saved Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbarOpen(false)} 
          severity="success" 
          variant="filled"
          sx={{ width: '100%' }}
        >
          Settings Saved
        </Alert>
      </Snackbar>
    </>
  );
}
