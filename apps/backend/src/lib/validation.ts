const EMAIL_REGEX =
  /^[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-zA-Z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?!\.)([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;

const EMAIL_MAX_LENGTH = 254;

export function isValidEmail(value: string): boolean {
  if (value.length > EMAIL_MAX_LENGTH) {
    return false;
  }
  return EMAIL_REGEX.test(value);
}
