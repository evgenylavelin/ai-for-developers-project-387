const LOCAL_PART_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL_RE = /^[a-zA-Z0-9-]+$/;
const TLD_RE = /^[a-zA-Z]{2,}$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_LOCAL_LENGTH = 64;

export function isValidEmail(value: string): boolean {
  if (value.length > MAX_EMAIL_LENGTH) return false;

  const atIndex = value.indexOf("@");
  if (atIndex < 1 || atIndex === value.length - 1) return false;

  const local = value.slice(0, atIndex);
  const domain = value.slice(atIndex + 1);

  if (local.length > MAX_LOCAL_LENGTH) return false;
  if (local.startsWith(".") || local.endsWith(".")) return false;
  if (local.includes("..")) return false;
  if (!LOCAL_PART_RE.test(local)) return false;

  if (domain.startsWith(".") || domain.endsWith(".")) return false;
  if (domain.includes("..")) return false;

  const labels = domain.split(".");
  if (labels.length < 2) return false;

  const tld = labels[labels.length - 1];
  if (!TLD_RE.test(tld)) return false;

  for (const label of labels) {
    if (label.startsWith("-") || label.endsWith("-")) return false;
    if (!DOMAIN_LABEL_RE.test(label)) return false;
  }

  return true;
}
