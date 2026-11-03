/** Only 2xx counts as the site running successfully. */
export function isRunningStatus(code: number | null | undefined): boolean {
  return code != null && code >= 200 && code < 300;
}

const STATUS_TEXT: Record<number, string> = {
  200: "OK — site running",
  201: "Created — site running",
  202: "Accepted — site running",
  204: "No Content — site running",
  301: "Moved Permanently — redirected",
  302: "Found — redirected",
  304: "Not Modified",
  307: "Temporary Redirect",
  308: "Permanent Redirect",
  400: "Bad Request — site down",
  401: "Unauthorized — site down",
  403: "Forbidden — site down",
  404: "Not Found — site down",
  405: "Method Not Allowed — site down",
  408: "Request Timeout — site down",
  409: "Conflict — site down",
  410: "Gone — site down",
  429: "Too Many Requests — site down",
  500: "Internal Server Error — site down",
  501: "Not Implemented — site down",
  502: "Bad Gateway — site down",
  503: "Service Unavailable — site down",
  504: "Gateway Timeout — site down",
  505: "HTTP Version Not Supported — site down",
};

function fallbackDescription(code: number): string {
  if (code >= 200 && code < 300) return "Success — site running";
  if (code >= 300 && code < 400) return "Redirect — not a healthy run state";
  if (code >= 400 && code < 500) return "Client error — site down";
  if (code >= 500) return "Server error — site down";
  return "Unexpected status — site down";
}

export function describeStatusCode(code: number | null | undefined): string {
  if (code == null) return "No response — site down";
  return STATUS_TEXT[code] ?? fallbackDescription(code);
}

export function formatStatusLine(code: number | null | undefined): string {
  if (code == null) return "— No HTTP status (site down)";
  return `${code} — ${describeStatusCode(code)}`;
}
