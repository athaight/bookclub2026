"use client";

import { Box, IconButton } from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import StarBorderIcon from "@mui/icons-material/StarBorder";

type StarRatingProps = {
  value: number | null | undefined;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  size?: "small" | "medium";
};

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "medium",
}: StarRatingProps) {
  const stars = [1, 2, 3, 4, 5];
  const iconSize = size === "small" ? "small" : "medium";
  const iconSx = size === "small" ? { fontSize: 16 } : { fontSize: 24 };

  if (readOnly) {
    return (
      <Box sx={{ display: "flex", alignItems: "center" }}>
        {stars.map((star) => (
          <Box key={star} sx={{ color: star <= (value ?? 0) ? "warning.main" : "action.disabled" }}>
            {star <= (value ?? 0) ? (
              <StarIcon sx={iconSx} />
            ) : (
              <StarBorderIcon sx={iconSx} />
            )}
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ display: "flex", alignItems: "center" }}>
      {stars.map((star) => (
        <IconButton
          key={star}
          size="small"
          onClick={() => {
            if (onChange) {
              // If clicking the same star, clear the rating
              onChange(value === star ? null : star);
            }
          }}
          sx={{
            p: 0.25,
            color: star <= (value ?? 0) ? "warning.main" : "action.disabled",
          }}
        >
          {star <= (value ?? 0) ? (
            <StarIcon fontSize={iconSize} />
          ) : (
            <StarBorderIcon fontSize={iconSize} />
          )}
        </IconButton>
      ))}
    </Box>
  );
}
