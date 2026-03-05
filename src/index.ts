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

export type AuthSettings = {
  email_enabled: boolean;
  phone_enabled: boolean;
  google_enabled: boolean;
  apple_enabled: boolean;
  microsoft_enabled: boolean;
  disable_signup: boolean;
  allow_anonymous: boolean;
  updated_at: string;
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

export type EdgeFunction = {
  id: string;
  name: string;
  runtime: string;
  source: string;
  created_at: string;
  updated_at: string;
};

export type FunctionInvokeResult = {
  result: unknown;
  runtime_ms: number;
  function: string;
  invoked_at: string;
  runtime_env: string;
};

export type Secret = {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type EmailTemplate = {
  id: string;
  name: string;
  subject: string;
  body_text: string;
  body_html: string;
  created_at: string;
  updated_at: string;
};

export type AIConfig = {
  id: string;
  name: string;
  provider: string;
  model: string;
  base_url: string;
  secret_name: string;
  default_config: boolean;
  created_at: string;
  updated_at: string;
};

export type AIChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type AIChatResponse = {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: string; content: string };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type AIEmbeddingsResponse = {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: { prompt_tokens: number; total_tokens: number };
};

export type AIUsage = {
  total_requests: number;
  models_count: number;
  top_model: string;
};

export type LogEntry = {
  id: string;
  app_id: string;
  level: string;
  source: string;
  message: string;
  meta: Record<string, unknown>;
  created_at: string;
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

    // ── Auth ──────────────────────────────────────────────────────────
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
      },
      users: {
        list(params: { limit?: number; offset?: number; search?: string } = {}) {
          const qs = new URLSearchParams();
          if (params.limit) qs.set("limit", String(params.limit));
          if (params.offset) qs.set("offset", String(params.offset));
          if (params.search) qs.set("search", params.search);
          const suffix = qs.toString() ? `?${qs.toString()}` : "";
          return request<{ items: AppUser[] }>(`/v1/auth/users${suffix}`, { method: "GET" });
        },
        create(email: string, password: string, metadata: Record<string, unknown> = {}) {
          return request<{ user: AppUser }>("/v1/auth/users", {
            method: "POST",
            body: JSON.stringify({ email, password, metadata })
          });
        },
      },
      settings: {
        get() {
          return request<AuthSettings>("/v1/auth/settings", { method: "GET" });
        },
        update(settings: Partial<Omit<AuthSettings, "updated_at">>) {
          return request<AuthSettings>("/v1/auth/settings", {
            method: "PATCH",
            body: JSON.stringify(settings)
          });
        },
      },
    },

    // ── Database ─────────────────────────────────────────────────────
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

    // ── Storage ──────────────────────────────────────────────────────
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
      buckets() {
        return request<{ items: string[] }>("/v1/storage/buckets", { method: "GET" });
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
    },

    // ── Edge Functions ───────────────────────────────────────────────
    functions: {
      list(limit = 100) {
        return request<{ items: EdgeFunction[] }>(`/v1/functions?limit=${limit}`, { method: "GET" });
      },
      create(params: { name: string; runtime?: string; source: string }) {
        return request<EdgeFunction>("/v1/functions", {
          method: "POST",
          body: JSON.stringify(params)
        });
      },
      get(name: string) {
        return request<EdgeFunction>(`/v1/functions/${encodeURIComponent(name)}`, { method: "GET" });
      },
      delete(name: string) {
        return request<{ deleted: boolean }>(`/v1/functions/${encodeURIComponent(name)}`, { method: "DELETE" });
      },
      invoke(name: string, payload: Record<string, unknown> = {}) {
        return request<FunctionInvokeResult>(`/v1/functions/${encodeURIComponent(name)}/invoke`, {
          method: "POST",
          body: JSON.stringify({ payload })
        });
      },
    },

    // ── Secrets ──────────────────────────────────────────────────────
    secrets: {
      list(limit = 200) {
        return request<{ items: Secret[] }>(`/v1/secrets?limit=${limit}`, { method: "GET" });
      },
      create(name: string, value: string) {
        return request<Secret>("/v1/secrets", {
          method: "POST",
          body: JSON.stringify({ name, value })
        });
      },
      get(name: string) {
        return request<Secret>(`/v1/secrets/${encodeURIComponent(name)}`, { method: "GET" });
      },
      delete(name: string) {
        return request<{ deleted: boolean }>(`/v1/secrets/${encodeURIComponent(name)}`, { method: "DELETE" });
      },
    },

    // ── Email Templates ──────────────────────────────────────────────
    email: {
      templates: {
        list(limit = 200) {
          return request<{ items: EmailTemplate[] }>(`/v1/email/templates?limit=${limit}`, { method: "GET" });
        },
        create(params: { name: string; subject: string; body_text: string; body_html: string }) {
          return request<EmailTemplate>("/v1/email/templates", {
            method: "POST",
            body: JSON.stringify(params)
          });
        },
        get(name: string) {
          return request<EmailTemplate>(`/v1/email/templates/${encodeURIComponent(name)}`, { method: "GET" });
        },
        delete(name: string) {
          return request<{ deleted: boolean }>(`/v1/email/templates/${encodeURIComponent(name)}`, { method: "DELETE" });
        },
      },
    },

    // ── AI ────────────────────────────────────────────────────────────
    ai: {
      configs: {
        list(limit = 200) {
          return request<{ items: AIConfig[] }>(`/v1/ai/configs?limit=${limit}`, { method: "GET" });
        },
        create(params: {
          name: string;
          provider: string;
          model: string;
          base_url?: string;
          secret_name: string;
          default_config?: boolean;
        }) {
          return request<AIConfig>("/v1/ai/configs", {
            method: "POST",
            body: JSON.stringify(params)
          });
        },
        get(name: string) {
          return request<AIConfig>(`/v1/ai/configs/${encodeURIComponent(name)}`, { method: "GET" });
        },
        delete(name: string) {
          return request<{ deleted: boolean }>(`/v1/ai/configs/${encodeURIComponent(name)}`, { method: "DELETE" });
        },
      },
      chat(params: {
        config?: string;
        model?: string;
        messages: AIChatMessage[];
        temperature?: number;
        max_tokens?: number;
      }) {
        return request<AIChatResponse>("/v1/ai/chat", {
          method: "POST",
          body: JSON.stringify({ ...params, stream: false })
        });
      },
      embeddings(params: {
        config?: string;
        model?: string;
        input: string | string[];
      }) {
        return request<AIEmbeddingsResponse>("/v1/ai/embeddings", {
          method: "POST",
          body: JSON.stringify(params)
        });
      },
      usage(period?: "1h" | "24h" | "7d" | "30d") {
        const suffix = period ? `?period=${period}` : "";
        return request<AIUsage>(`/v1/ai/usage${suffix}`, { method: "GET" });
      },
    },

    // ── Logs ──────────────────────────────────────────────────────────
    logs: {
      list(params: {
        limit?: number;
        period?: "1h" | "24h" | "7d" | "30d";
        cursor?: string;
        type?: string;
        level?: string;
        search?: string;
      } = {}) {
        const qs = new URLSearchParams();
        if (params.limit) qs.set("limit", String(params.limit));
        if (params.period) qs.set("period", params.period);
        if (params.cursor) qs.set("cursor", params.cursor);
        if (params.type) qs.set("type", params.type);
        if (params.level) qs.set("level", params.level);
        if (params.search) qs.set("search", params.search);
        const suffix = qs.toString() ? `?${qs.toString()}` : "";
        return request<{ items: LogEntry[]; meta?: { next_cursor?: string } }>(`/v1/logs${suffix}`, { method: "GET" });
      },
    },
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
