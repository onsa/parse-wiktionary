export function padMultilevel(text: string, padding: number = 2): string {
  return text
    .split('.')
    .map((n: string): string => n.padStart(padding, '0'))
    .join('.');
}
