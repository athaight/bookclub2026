export type Member = { email: string; name: string };

export function getMembers(): Member[] {
  const raw = process.env.NEXT_PUBLIC_MEMBERS_JSON;
  if (!raw) throw new Error("Missing NEXT_PUBLIC_MEMBERS_JSON");
  return JSON.parse(raw) as Member[];
}
