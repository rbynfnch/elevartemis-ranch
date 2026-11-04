/** Pasted video addresses, turned into a provider and an id. The owner never handles embed code. */
export type VideoRef = { provider: "youtube" | "vimeo"; videoId: string; url: string };

const YT_ID = /^[A-Za-z0-9_-]{11}$/;

export function parseVideoEmbed(raw: string): VideoRef | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const host = url.hostname
    .replace(/^www\./, "")
    .replace(/^m\./, "")
    .toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "youtu.be") {
    const id = parts[0] ?? "";
    return YT_ID.test(id) ? { provider: "youtube", videoId: id, url: `https://www.youtube.com/watch?v=${id}` } : null;
  }
  if (host === "youtube.com" || host === "youtube-nocookie.com") {
    let id = "";
    if (parts[0] === "watch") id = url.searchParams.get("v") ?? "";
    else if (["embed", "shorts", "live", "v"].includes(parts[0] ?? "")) id = parts[1] ?? "";
    return YT_ID.test(id) ? { provider: "youtube", videoId: id, url: `https://www.youtube.com/watch?v=${id}` } : null;
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const id = [...parts].reverse().find((p) => /^\d{5,12}$/.test(p)) ?? "";
    return id ? { provider: "vimeo", videoId: id, url: `https://vimeo.com/${id}` } : null;
  }
  return null;
}

/** The address of the privacy-friendly player. */
export function embedSrc(provider: "youtube" | "vimeo", videoId: string): string {
  return provider === "youtube"
    ? `https://www.youtube-nocookie.com/embed/${videoId}`
    : `https://player.vimeo.com/video/${videoId}?dnt=1`;
}
