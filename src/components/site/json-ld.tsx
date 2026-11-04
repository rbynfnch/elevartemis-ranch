/**
 * Structured data for search and answer engines. The data is JSON the server builds from the ranch's own
 * records; "<" is escaped so nothing in it can close the script tag.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
