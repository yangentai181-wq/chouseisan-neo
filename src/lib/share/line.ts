export function getLineShareUrl(url: string, text: string): string {
  const encodedUrl = encodeURIComponent(url);
  const encodedText = encodeURIComponent(text);
  return `https://line.me/R/msg/text/?${encodedText}%0A${encodedUrl}`;
}
