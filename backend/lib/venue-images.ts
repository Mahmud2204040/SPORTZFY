export function venueImageUrls(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 10) throw new Error("INVALID_VENUE_IMAGES");
  const urls = value.map(item => {
    if (typeof item !== "string" || item.length > 1000) throw new Error("INVALID_VENUE_IMAGES");
    try {
      const url = new URL(item.trim());
      if (!["https:", "http:"].includes(url.protocol)) throw new Error();
      return url.toString();
    } catch { throw new Error("INVALID_VENUE_IMAGES"); }
  });
  if (new Set(urls).size !== urls.length) throw new Error("INVALID_VENUE_IMAGES");
  return urls;
}
