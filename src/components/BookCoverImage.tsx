"use client";

import { useState, useRef } from "react";
import { Avatar, Box, IconButton, CircularProgress, Typography } from "@mui/material";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AddPhotoAlternateIcon from "@mui/icons-material/AddPhotoAlternate";
import { supabase } from "@/lib/supabaseClient";

interface BookCoverImageProps {
  coverUrl?: string | null;
  title: string;
  width?: number;
  height?: number;
  /** Allow the user to upload a new cover image */
  editable?: boolean;
  /** Callback when a new cover is uploaded - returns the public URL */
  onCoverChange?: (newUrl: string) => void;
  /** Optional: provide a pending file for preview before upload */
  pendingFile?: File | null;
  /** Optional: callback for when file is selected (for preview before save) */
  onFileSelect?: (file: File, previewUrl: string) => void;
  /** Show as small inline version (for search results, etc) */
  variant?: "default" | "small" | "large";
}

export default function BookCoverImage({
  coverUrl,
  title,
  width,
  height,
  editable = false,
  onCoverChange,
  pendingFile,
  onFileSelect,
  variant = "default",
}: BookCoverImageProps) {
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine dimensions based on variant
  const dimensions = {
    small: { width: width ?? 32, height: height ?? 48 },
    default: { width: width ?? 40, height: height ?? 60 },
    large: { width: width ?? 60, height: height ?? 90 },
  };

  const { width: imgWidth, height: imgHeight } = dimensions[variant];

  // Determine what to display
  const displayUrl = localPreview || coverUrl;

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;

    const file = event.target.files[0];
    
    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);

    // If onFileSelect is provided, let parent handle the file (for preview before save)
    if (onFileSelect) {
      onFileSelect(file, previewUrl);
      return;
    }

    // Otherwise, upload immediately
    if (onCoverChange) {
      setUploading(true);
      try {
        const fileExt = file.name.split(".").pop();
        const fileName = `cover_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("book-covers")
          .upload(fileName, file, { upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          setLocalPreview(null);
          return;
        }

        const { data: urlData } = supabase.storage.from("book-covers").getPublicUrl(fileName);
        onCoverChange(urlData.publicUrl);
      } catch (error) {
        console.error("Error uploading cover:", error);
        setLocalPreview(null);
      } finally {
        setUploading(false);
      }
    }

    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Render placeholder when no cover
  if (!displayUrl) {
    return (
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <Box
          sx={{
            width: imgWidth,
            height: imgHeight,
            bgcolor: "grey.300",
            borderRadius: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <MenuBookIcon
            sx={{
              color: "grey.500",
              fontSize: variant === "small" ? 16 : variant === "large" ? 28 : 20,
            }}
          />
          {variant !== "small" && (
            <Typography
              variant="caption"
              sx={{
                color: "grey.500",
                fontSize: variant === "large" ? 9 : 7,
                mt: 0.25,
                textAlign: "center",
                px: 0.25,
                lineHeight: 1.1,
              }}
            >
              No cover
            </Typography>
          )}
        </Box>

        {editable && (
          <>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              ref={fileInputRef}
            />
            <IconButton
              size="small"
              onClick={handleUploadClick}
              disabled={uploading}
              sx={{
                position: "absolute",
                bottom: -4,
                right: -4,
                bgcolor: "background.paper",
                boxShadow: 1,
                width: 20,
                height: 20,
                "&:hover": { bgcolor: "grey.100" },
              }}
            >
              {uploading ? (
                <CircularProgress size={12} />
              ) : (
                <AddPhotoAlternateIcon sx={{ fontSize: 12 }} />
              )}
            </IconButton>
          </>
        )}
      </Box>
    );
  }

  // Render cover image
  return (
    <Box sx={{ position: "relative", display: "inline-flex" }}>
      <Avatar
        src={displayUrl}
        alt={`Cover of ${title}`}
        variant="rounded"
        sx={{
          width: imgWidth,
          height: imgHeight,
          flexShrink: 0,
          "& img": { objectFit: "cover" },
        }}
      />

      {editable && (
        <>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
            ref={fileInputRef}
          />
          <IconButton
            size="small"
            onClick={handleUploadClick}
            disabled={uploading}
            sx={{
              position: "absolute",
              bottom: -4,
              right: -4,
              bgcolor: "background.paper",
              boxShadow: 1,
              width: 20,
              height: 20,
              "&:hover": { bgcolor: "grey.100" },
            }}
          >
            {uploading ? (
              <CircularProgress size={12} />
            ) : (
              <AddPhotoAlternateIcon sx={{ fontSize: 12 }} />
            )}
          </IconButton>
        </>
      )}
    </Box>
  );
}
