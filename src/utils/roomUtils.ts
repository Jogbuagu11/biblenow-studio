export function toRoomSlug(input: string): string {
  const raw = (input || 'bible-study').toString().trim();
  // If legacy JAAS style like "vpaas-magic-cookie-.../room", take the last segment
  const lastSegment = raw.includes('/') ? raw.split('/').filter(Boolean).pop()! : raw;
  // Remove any lingering known prefixes
  const noPrefix = lastSegment.replace(/^vpaas-magic-cookie-[a-z0-9]+-?/i, '');
  const slug = noPrefix
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Keep spaces for better readability
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 30); // Limit length
  return `stream-${slug || 'bible-study'}`;
}

export function sanitizeRoomName(input: string): string {
  const raw = (input || 'bible-study').toString().trim();
  // Take last segment if a path-like value is provided
  const lastSegment = raw.includes('/') ? raw.split('/').filter(Boolean).pop()! : raw;
  // Remove JAAS vpaas prefix if present
  const noJaas = lastSegment.replace(/^vpaas-magic-cookie-[a-z0-9]+-?/i, '');
  // Create a safe plain room name without extra prefixes
  return noJaas
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Keep spaces for better readability
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    .substring(0, 40) || 'bible-study'; // Limit length and provide fallback
} 