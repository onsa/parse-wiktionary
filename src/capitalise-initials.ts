export function capitaliseInitials(text: string): string {
  return text
    .split(' ')
    .map(
      (t: string): string => t[0].toUpperCase() + t.slice(1)
    )
    .join(' ');
}
