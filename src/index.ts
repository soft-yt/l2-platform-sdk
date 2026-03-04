export type AppUser = {
  id: string;
  email: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AuthPayload = {
  user: AppUser;
  access_token: string;
  refresh_token?: string;
};

export type DBQueryResult = {
  columns: string[];
  rows: unknown[][];
  tag: string;
};

export type MigrationInput = {
  version: number;
  name: string;
  up_sql: string;
  down_sql?: string;
};

export type StorageObject = {
  id: string;
  bucket: string;
  object_key: string;
  content_type: string;
  size_bytes: number;
  etag: string;
  created_at: string;
  updated_at: string;
};

export class AppBackendError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly code?: string;

  constructor(status: number, body: unknown, message?: string, code?: string) {
    super(message ?? `App Backend request failed with status ${status}`);
    this.status = status;
    this.body = body;
    this.code = code;
  }
}

export type ClientOptions = {
  accessToken?: string;
  fetchImpl?: typeof fetch;
};

export type BrowserEnv = {
  NEXT_PUBLIC_APP_BACKEND_URL?: string;
  NEXT_PUBLIC_APP_ANON_KEY?: string;
};

export type ServerEnv = {
  APP_BACKEND_URL?: string;
  APP_SERVICE_KEY?: string;
};

function trimSlash(v: string): string {
  return v.endsWith("/") ? v.slice(0, -1) : v;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  if (!v || typeof v !== "object" || Array.isArray(v)) {
    return null;
  }
  return v as Record<string, unknown>;
}

function normalizeErrorBody(body: unknown): { message: string; code?: string } {
  const rec = asRecord(body);
  if (!rec) {
    return { message: "request failed" };
  }
  const message = typeof rec.message === "string" && rec.message.trim() !== "" ? rec.message : "request failed";
  const code = typeof rec.code === "string" && rec.code.trim() !== "" ? rec.code : undefined;
  return { message, code };
}

function ensureNonEmpty(name: string, value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`${name} is required`);
  }
  return trimmed;
}

function bytesToBase64(bytes: Uint8Array): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const b0 = bytes[i];
    const hasB1 = i + 1 < bytes.length;
    const hasB2 = i + 2 < bytes.length;
    const b1 = hasB1 ? bytes[i + 1] : 0;
    const b2 = hasB2 ? bytes[i + 2] : 0;
    const triplet = (b0 << 16) | (b1 << 8) | b2;
    out += chars[(triplet >> 18) & 0x3f];
    out += chars[(triplet >> 12) & 0x3f];
    out += hasB1 ? chars[(triplet >> 6) & 0x3f] : "=";
    out += hasB2 ? chars[triplet & 0x3f] : "=";
  }
  return out;
}

export function isAppBackendError(err: unknown): err is AppBackendError {
  return err instanceof AppBackendError;
}

async function parseJSON(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

export function createClient(baseURL: string, apiKey: string, opts: ClientOptions = {}) {
  const fetchImpl = opts.fetchImpl ?? fetch;
  const base = trimSlash(ensureNonEmpty("baseURL", baseURL));
  const key = ensureNonEmpty("apiKey", apiKey);
  let accessToken = opts.accessToken ?? "";

  async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
    const headers = new Headers(init.headers ?? {});
    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    headers.set("apikey", key);
    if (auth && accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const response = await fetchImpl(`${base}${path}`, { ...init, headers });
    const body = await parseJSON(response);
    if (!response.ok) {
      const normalized = normalizeErrorBody(body);
      throw new AppBackendError(response.status, body, normalized.message, normalized.code);
    }
    const data = (body as { data?: T } | null)?.data;
    return (data ?? body) as T;
  }

  async function requestText(path: string, init: RequestInit = {}, auth = true): Promise<string> {
    const headers = new Headers(init.headers ?? {});
    headers.set("apikey", key);
    if (auth && accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    const response = await fetchImpl(`${base}${path}`, { ...init, headers });
    if (!response.ok) {
      const body = await parseJSON(response);
      const normalized = normalizeErrorBody(body);
      throw new AppBackendError(response.status, body, normalized.message, normalized.code);
    }
    return response.text();
  }

  async function requestBytes(path: string, init: RequestInit = {}, auth = true): Promise<Uint8Array> {
    const headers = new Headers(init.headers ?? {});
    headers.set("apikey", key);
    if (auth && accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    const response = await fetchImpl(`${base}${path}`, { ...init, headers });
    if (!response.ok) {
      const body = await parseJSON(response);
      const normalized = normalizeErrorBody(body);
      throw new AppBackendError(response.status, body, normalized.message, normalized.code);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  function from(table: string) {
    return {
      select(params: Record<string, string> = {}) {
        const qs = new URLSearchParams(params).toString();
        const suffix = qs ? `?${qs}` : "";
        return request<DBQueryResult>(`/v1/db/${table}${suffix}`, { method: "GET" });
      },
      insert(payload: Record<string, unknown>) {
        return request<DBQueryResult>(`/v1/db/${table}`, {
          method: "POST",
          body: JSON.stringify(payload)
        });
      },
      update(payload: Record<string, unknown>, filters: Record<string, string>) {
        const qs = new URLSearchParams(filters).toString();
        const suffix = qs ? `?${qs}` : "";
        return request<DBQueryResult>(`/v1/db/${table}${suffix}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      },
      delete(filters: Record<string, string>) {
        const qs = new URLSearchParams(filters).toString();
        const suffix = qs ? `?${qs}` : "";
        return request<DBQueryResult>(`/v1/db/${table}${suffix}`, { method: "DELETE" });
      }
    };
  }

  return {
    setAccessToken(token: string) {
      accessToken = token;
    },
    auth: {
      async register(email: string, password: string, metadata: Record<string, unknown> = {}) {
        const data = await request<AuthPayload>("/v1/auth/register", {
          method: "POST",
          body: JSON.stringify({ email, password, metadata })
        }, false);
        if (data.access_token) {
          accessToken = data.access_token;
        }
        return data;
      },
      async login(email: string, password: string) {
        const data = await request<AuthPayload>("/v1/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password })
        }, false);
        if (data.access_token) {
          accessToken = data.access_token;
        }
        return data;
      },
      async refresh(refreshToken: string) {
        const data = await request<AuthPayload>("/v1/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refreshToken })
        }, false);
        if (data.access_token) {
          accessToken = data.access_token;
        }
        return data;
      },
      me() {
        return request<{ user: AppUser }>("/v1/auth/me", { method: "GET" });
      }
    },
    db: {
      from,
      query(query: string, args: unknown[] = []) {
        return request<DBQueryResult>("/v1/db/query", {
          method: "POST",
          body: JSON.stringify({ query, args })
        });
      },
      rpc(functionName: string, args: unknown[] = []) {
        return request<DBQueryResult>(`/v1/db/rpc/${functionName}`, {
          method: "POST",
          body: JSON.stringify({ args })
        });
      },
      schema() {
        return request<DBQueryResult>("/v1/db/schema", { method: "GET" });
      },
      migrations: {
        list() {
          return request<{ items: Array<Record<string, unknown>> }>("/v1/db/migrations", { method: "GET" });
        },
        run(migrations: MigrationInput[]) {
          return request<{ applied: Array<Record<string, unknown>> }>("/v1/db/migrations/run", {
            method: "POST",
            body: JSON.stringify({ migrations })
          });
        },
        rollback(steps = 1) {
          return request<{ rolled_back: Array<Record<string, unknown>> }>("/v1/db/migrations/rollback", {
            method: "POST",
            body: JSON.stringify({ steps })
          });
        }
      }
    },
    storage: {
      uploadBase64(params: { bucket?: string; key: string; contentType?: string; dataBase64: string }) {
        return request<StorageObject>("/v1/storage/upload-base64", {
          method: "POST",
          body: JSON.stringify({
            bucket: params.bucket ?? "public",
            key: params.key,
            content_type: params.contentType ?? "application/octet-stream",
            data_base64: params.dataBase64
          })
        });
      },
      upload(params: { bucket?: string; key: string; contentType?: string; data: Uint8Array }) {
        return request<StorageObject>("/v1/storage/upload-base64", {
          method: "POST",
          body: JSON.stringify({
            bucket: params.bucket ?? "public",
            key: params.key,
            content_type: params.contentType ?? "application/octet-stream",
            data_base64: bytesToBase64(params.data)
          })
        });
      },
      list(params: { bucket?: string; prefix?: string; limit?: number } = {}) {
        const qs = new URLSearchParams();
        if (params.bucket) qs.set("bucket", params.bucket);
        if (params.prefix) qs.set("prefix", params.prefix);
        if (params.limit) qs.set("limit", String(params.limit));
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return request<{ items: StorageObject[] }>(`/v1/storage/list${suffix}`, { method: "GET" });
      },
      downloadText(params: { bucket?: string; key: string }) {
        const qs = new URLSearchParams();
        qs.set("bucket", params.bucket ?? "public");
        qs.set("key", params.key);
        return requestText(`/v1/storage/object?${qs.toString()}`, { method: "GET" });
      },
      downloadBytes(params: { bucket?: string; key: string }) {
        const qs = new URLSearchParams();
        qs.set("bucket", params.bucket ?? "public");
        qs.set("key", params.key);
        return requestBytes(`/v1/storage/object?${qs.toString()}`, { method: "GET" });
      },
      delete(params: { bucket?: string; key: string }) {
        return request<{ deleted: boolean }>("/v1/storage/delete", {
          method: "POST",
          body: JSON.stringify({ bucket: params.bucket ?? "public", key: params.key })
        });
      },
      signDownload(params: { bucket?: string; key: string; expiresIn?: number }) {
        return request<{ token: string; url: string }>("/v1/storage/sign-download", {
          method: "POST",
          body: JSON.stringify({
            bucket: params.bucket ?? "public",
            key: params.key,
            expires_in: params.expiresIn ?? 600
          })
        });
      },
      signedDownloadURL(token: string) {
        const t = encodeURIComponent(token);
        return `${base}/v1/storage/signed-download?token=${t}`;
      },
      downloadSignedText(token: string) {
        const t = encodeURIComponent(token);
        return requestText(`/v1/storage/signed-download?token=${t}`, { method: "GET" }, false);
      },
      async downloadSignedBytes(token: string) {
        const t = encodeURIComponent(token);
        const response = await fetchImpl(`${base}/v1/storage/signed-download?token=${t}`);
        if (!response.ok) {
          const body = await parseJSON(response);
          const normalized = normalizeErrorBody(body);
          throw new AppBackendError(response.status, body, normalized.message, normalized.code);
        }
        return new Uint8Array(await response.arrayBuffer());
      }
    }
  };
}

export function createBrowserClientFromEnv(env: BrowserEnv, opts: ClientOptions = {}) {
  const baseURL = ensureNonEmpty("NEXT_PUBLIC_APP_BACKEND_URL", env.NEXT_PUBLIC_APP_BACKEND_URL ?? "");
  const anonKey = ensureNonEmpty("NEXT_PUBLIC_APP_ANON_KEY", env.NEXT_PUBLIC_APP_ANON_KEY ?? "");
  return createClient(baseURL, anonKey, opts);
}

export function createServerClientFromEnv(env: ServerEnv, opts: ClientOptions = {}) {
  const baseURL = ensureNonEmpty("APP_BACKEND_URL", env.APP_BACKEND_URL ?? "");
  const serviceKey = ensureNonEmpty("APP_SERVICE_KEY", env.APP_SERVICE_KEY ?? "");
  return createClient(baseURL, serviceKey, opts);
}
