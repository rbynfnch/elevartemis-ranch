/**
 * A link to look a horse up on AllBreedPedigree: words joined with "+", as their own addresses are
 * (for example allbreedpedigree.com/fwr+thunder+storm). It is only a link the owner opens themselves;
 * nothing is fetched from that site.
 */
export function allBreedPedigreeUrl(name: string): string | null {
  const words = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/['’]/g, "")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  return words.length ? `https://www.allbreedpedigree.com/${words.join("+")}` : null;
}
