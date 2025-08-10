export function toRoomSlug(title: string): string {
  const slug = (title || 'biblenow-room')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `stream-${slug}`;
} 