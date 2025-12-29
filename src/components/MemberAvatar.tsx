import Link from "next/link";
import { Avatar, AvatarProps, Box } from "@mui/material";
import { ProfileRow } from "@/types";

interface MemberAvatarProps extends Omit<AvatarProps, 'src' | 'children'> {
  name: string;
  email: string;
  profiles: Record<string, ProfileRow>;
  size?: "small" | "medium" | "large";
  linkToProfile?: boolean;
}

const sizeMap = {
  small: 24,
  medium: 32,
  large: 40,
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export default function MemberAvatar({
  name,
  email,
  profiles,
  size = "small",
  linkToProfile = false,
  sx,
  ...props
}: MemberAvatarProps) {
  const profile = profiles[email.toLowerCase()];
  const avatarUrl = profile?.avatar_url;
  const dimension = sizeMap[size];

  const avatar = (
    <Avatar
      src={avatarUrl || undefined}
      sx={{
        width: dimension,
        height: dimension,
        fontSize: dimension * 0.45,
        ...(linkToProfile && {
          cursor: "pointer",
          transition: "transform 0.2s ease, box-shadow 0.2s ease",
          "&:hover": {
            transform: "scale(1.1)",
            boxShadow: "0 4px 12px rgba(102, 126, 234, 0.3)",
          },
        }),
        ...sx,
      }}
      {...props}
    >
      {!avatarUrl && getInitials(name)}
    </Avatar>
  );

  if (linkToProfile) {
    return (
      <Link href="/profiles" style={{ textDecoration: "none" }}>
        {avatar}
      </Link>
    );
  }

  return avatar;
}
