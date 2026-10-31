const SPLIT = /[\s,;，；、]+/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseRecipients(value: unknown): { emails: string[]; invalid: string[] } {
  const raw = Array.isArray(value) ? value.map((item) => String(item)).join("\n") : typeof value === "string" ? value : "";
  const emails: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(SPLIT)) {
    const email = part.trim();
    if (!email) continue;
    if (!EMAIL.test(email)) {
      invalid.push(email);
      continue;
    }
    const key = email.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    emails.push(email);
  }
  return { emails, invalid };
}

export function recipientFieldError(value: unknown, required: boolean): string | null {
  const { emails, invalid } = parseRecipients(value);
  if (invalid.length) return `这些收件地址无效：${invalid.join("、")}`;
  if (required && emails.length === 0) return "请至少填写一个收件邮箱";
  return null;
}

export function formatRecipients(emails: string[]): string {
  return emails.join("、");
}
