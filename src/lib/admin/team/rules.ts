/** Who may do what on the team list. Pure, so the rules are easy to test. */
export type Member = { userId: string; email: string; role: "owner" | "editor" };

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export function tidyEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  return e.length <= 200 && EMAIL.test(e) ? e : null;
}

/** An owner can't remove themselves, and a ranch must always keep at least one owner. */
export function whyCannotRemove(members: Member[], targetUserId: string, actorUserId: string): string | null {
  const target = members.find((m) => m.userId === targetUserId);
  if (!target) return "That person isn't on your team.";
  if (targetUserId === actorUserId) return "You can't remove yourself. Ask another owner to do it.";
  if (target.role === "owner" && members.filter((m) => m.role === "owner").length <= 1)
    return "Your ranch needs at least one owner.";
  return null;
}

export function whyCannotChangeRole(
  members: Member[],
  targetUserId: string,
  actorUserId: string,
  role: "owner" | "editor",
): string | null {
  const target = members.find((m) => m.userId === targetUserId);
  if (!target) return "That person isn't on your team.";
  if (target.role === role) return null;
  if (targetUserId === actorUserId && role === "editor") return "You can't make yourself an editor. Ask another owner.";
  if (target.role === "owner" && role === "editor" && members.filter((m) => m.role === "owner").length <= 1)
    return "Your ranch needs at least one owner.";
  return null;
}
