"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ProfileRow } from "@/types";

/**
 * Hook to fetch profile data (including avatars) for all members
 */
export function useProfiles(memberEmails: string[]) {
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (memberEmails.length === 0) {
      setLoading(false);
      return;
    }

    let mounted = true;

    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .in("email", memberEmails);

      if (!mounted) return;

      if (error) {
        console.error("Error fetching profiles:", error);
        setLoading(false);
        return;
      }

      const profileMap: Record<string, ProfileRow> = {};
      for (const profile of data || []) {
        profileMap[profile.email.toLowerCase()] = profile;
      }

      setProfiles(profileMap);
      setLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [memberEmails]);

  return { profiles, loading };
}

/**
 * Get avatar URL for a member, with fallback to initials
 */
export function getAvatarUrl(
  profiles: Record<string, ProfileRow>,
  email: string
): string | undefined {
  const profile = profiles[email.toLowerCase()];
  return profile?.avatar_url || undefined;
}
