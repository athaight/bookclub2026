import { Avatar, AvatarProps } from "@mui/material";
import { ProfileRow } from "@/types";

interface MemberAvatarProps extends Omit<AvatarProps, 'src' | 'children'> {
  name: string;
  email: string;
  profiles: Record<string, ProfileRow>;
  size?: "small" | "medium" | "large";
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
  sx,
  ...props
}: MemberAvatarProps) {
  const profile = profiles[email.toLowerCase()];
  const avatarUrl = profile?.avatar_url;
  const dimension = sizeMap[size];

  return (
    <Avatar
      src={avatarUrl || undefined}
      sx={{
        width: dimension,
        height: dimension,
        fontSize: dimension * 0.45,
        ...sx,
      }}
      {...props}
    >
      {!avatarUrl && getInitials(name)}
    </Avatar>
  );
}
