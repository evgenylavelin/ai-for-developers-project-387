function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    return `/${path}`;
  }

  return path;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string") {
    return payload.trim() || null;
  }

  if (!isRecord(payload)) {
    return null;
  }

  const message = payload.message;
  if (typeof message === "string" && message.trim()) {
    return message;
  }

  const error = payload.error;
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  const detail = payload.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }

  return null;
}

export function buildApiUrl(path: string): string {
  const normalizedPath = normalizePath(path);
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (!configuredBaseUrl) {
    return normalizedPath;
  }

  return `${configuredBaseUrl.replace(/\/$/, "")}${normalizedPath}`;
}

export async function readApiErrorMessage(response: Response): Promise<string | null> {
  try {
    const text = await response.text();

    if (!text.trim()) {
      return null;
    }

    try {
      return getErrorMessage(JSON.parse(text));
    } catch {
      return text.trim();
    }
  } catch {
    return null;
  }
}