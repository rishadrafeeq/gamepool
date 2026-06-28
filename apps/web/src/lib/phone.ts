const E164_REGEX = /^\+[1-9]\d{6,14}$/;

export function normalizePhoneNumber(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith("+")) {
    return `+${trimmed.slice(1).replace(/\D/g, "")}`;
  }
  const digits = trimmed.replace(/\D/g, "");
  if (digits.length === 10) return `+91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return `+${digits}`;
  return `+${digits}`;
}

export function isValidE164Phone(phone: string): boolean {
  return E164_REGEX.test(phone);
}

export function maskPhoneNumber(phone: string): string {
  if (phone.length < 6) return phone;
  return `${phone.slice(0, 4)}****${phone.slice(-2)}`;
}
