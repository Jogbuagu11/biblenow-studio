export function toRoomSlug(input: string): string {
  const raw = (input || 'biblenow-room').toString();
  // If legacy JAAS style like "vpaas-magic-cookie-.../room", take the last segment
  const lastSegment = raw.includes('/') ? raw.split('/').filter(Boolean).pop()! : raw;
  // Remove any lingering known prefixes
  const noPrefix = lastSegment.replace(/^vpaas-magic-cookie-[a-z0-9]+-?/i, '');
  const slug = noPrefix
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `stream-${slug || 'room'}`;
}

export function sanitizeRoomName(input: string): string {
  const raw = (input || 'biblenow-room').toString();
  // Take last segment if a path-like value is provided
  const lastSegment = raw.includes('/') ? raw.split('/').filter(Boolean).pop()! : raw;
  // Remove JAAS vpaas prefix if present
  const noJaas = lastSegment.replace(/^vpaas-magic-cookie-[a-z0-9]+-?/i, '');
  // Create a safe plain room name without extra prefixes
  return noJaas
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'biblenow-room';
} 