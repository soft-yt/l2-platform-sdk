export class AppBackendError extends Error {
    status;
    body;
    code;
    constructor(status, body, message, code) {
        super(message ?? `App Backend request failed with status ${status}`);
        this.status = status;
        this.body = body;
        this.code = code;
    }
}
function trimSlash(v) {
    return v.endsWith("/") ? v.slice(0, -1) : v;
}
function asRecord(v) {
    if (!v || typeof v !== "object" || Array.isArray(v)) {
        return null;
    }
    return v;
}
function normalizeErrorBody(body) {
    const rec = asRecord(body);
    if (!rec) {
        return { message: "request failed" };
    }
    const message = typeof rec.message === "string" && rec.message.trim() !== "" ? rec.message : "request failed";
    const code = typeof rec.code === "string" && rec.code.trim() !== "" ? rec.code : undefined;
    return { message, code };
}
function ensureNonEmpty(name, value) {
    const trimmed = value.trim();
    if (!trimmed) {
        throw new Error(`${name} is required`);
    }
    return trimmed;
}
function bytesToBase64(bytes) {
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
export function isAppBackendError(err) {
    return err instanceof AppBackendError;
}
async function parseJSON(response) {
    const text = await response.text();
    if (!text) {
        return null;
    }
    try {
        return JSON.parse(text);
    }
    catch {
        return { raw: text };
    }
}
export function createClient(baseURL, apiKey, opts = {}) {
    const fetchImpl = opts.fetchImpl ?? fetch;
    const base = trimSlash(ensureNonEmpty("baseURL", baseURL));
    const key = ensureNonEmpty("apiKey", apiKey);
    let accessToken = opts.accessToken ?? "";
    async function request(path, init = {}, auth = true) {
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
        const data = body?.data;
        return (data ?? body);
    }
    async function requestText(path, init = {}, auth = true) {
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
    async function requestBytes(path, init = {}, auth = true) {
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
    function from(table) {
        return {
            select(params = {}) {
                const qs = new URLSearchParams(params).toString();
                const suffix = qs ? `?${qs}` : "";
                return request(`/v1/db/${table}${suffix}`, { method: "GET" });
            },
            insert(payload) {
                return request(`/v1/db/${table}`, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });
            },
            update(payload, filters) {
                const qs = new URLSearchParams(filters).toString();
                const suffix = qs ? `?${qs}` : "";
                return request(`/v1/db/${table}${suffix}`, {
                    method: "PATCH",
                    body: JSON.stringify(payload)
                });
            },
            delete(filters) {
                const qs = new URLSearchParams(filters).toString();
                const suffix = qs ? `?${qs}` : "";
                return request(`/v1/db/${table}${suffix}`, { method: "DELETE" });
            }
        };
    }
    return {
        setAccessToken(token) {
            accessToken = token;
        },
        // ── Auth ──────────────────────────────────────────────────────────
        auth: {
            async register(email, password, metadata = {}) {
                const data = await request("/v1/auth/register", {
                    method: "POST",
                    body: JSON.stringify({ email, password, metadata })
                }, false);
                if (data.access_token) {
                    accessToken = data.access_token;
                }
                return data;
            },
            async login(email, password) {
                const data = await request("/v1/auth/login", {
                    method: "POST",
                    body: JSON.stringify({ email, password })
                }, false);
                if (data.access_token) {
                    accessToken = data.access_token;
                }
                return data;
            },
            async refresh(refreshToken) {
                const data = await request("/v1/auth/refresh", {
                    method: "POST",
                    body: JSON.stringify({ refresh_token: refreshToken })
                }, false);
                if (data.access_token) {
                    accessToken = data.access_token;
                }
                return data;
            },
            me() {
                return request("/v1/auth/me", { method: "GET" });
            },
            users: {
                list(params = {}) {
                    const qs = new URLSearchParams();
                    if (params.limit)
                        qs.set("limit", String(params.limit));
                    if (params.offset)
                        qs.set("offset", String(params.offset));
                    if (params.search)
                        qs.set("search", params.search);
                    const suffix = qs.toString() ? `?${qs.toString()}` : "";
                    return request(`/v1/auth/users${suffix}`, { method: "GET" });
                },
                create(email, password, metadata = {}) {
                    return request("/v1/auth/users", {
                        method: "POST",
                        body: JSON.stringify({ email, password, metadata })
                    });
                },
            },
            settings: {
                get() {
                    return request("/v1/auth/settings", { method: "GET" });
                },
                update(settings) {
                    return request("/v1/auth/settings", {
                        method: "PATCH",
                        body: JSON.stringify(settings)
                    });
                },
            },
        },
        // ── Database ─────────────────────────────────────────────────────
        db: {
            from,
            query(query, args = []) {
                return request("/v1/db/query", {
                    method: "POST",
                    body: JSON.stringify({ query, args })
                });
            },
            rpc(functionName, args = []) {
                return request(`/v1/db/rpc/${functionName}`, {
                    method: "POST",
                    body: JSON.stringify({ args })
                });
            },
            schema() {
                return request("/v1/db/schema", { method: "GET" });
            },
            migrations: {
                list() {
                    return request("/v1/db/migrations", { method: "GET" });
                },
                run(migrations) {
                    return request("/v1/db/migrations/run", {
                        method: "POST",
                        body: JSON.stringify({ migrations })
                    });
                },
                rollback(steps = 1) {
                    return request("/v1/db/migrations/rollback", {
                        method: "POST",
                        body: JSON.stringify({ steps })
                    });
                }
            }
        },
        // ── Storage ──────────────────────────────────────────────────────
        storage: {
            uploadBase64(params) {
                return request("/v1/storage/upload-base64", {
                    method: "POST",
                    body: JSON.stringify({
                        bucket: params.bucket ?? "public",
                        key: params.key,
                        content_type: params.contentType ?? "application/octet-stream",
                        data_base64: params.dataBase64
                    })
                });
            },
            upload(params) {
                return request("/v1/storage/upload-base64", {
                    method: "POST",
                    body: JSON.stringify({
                        bucket: params.bucket ?? "public",
                        key: params.key,
                        content_type: params.contentType ?? "application/octet-stream",
                        data_base64: bytesToBase64(params.data)
                    })
                });
            },
            list(params = {}) {
                const qs = new URLSearchParams();
                if (params.bucket)
                    qs.set("bucket", params.bucket);
                if (params.prefix)
                    qs.set("prefix", params.prefix);
                if (params.limit)
                    qs.set("limit", String(params.limit));
                const suffix = qs.toString() ? `?${qs.toString()}` : "";
                return request(`/v1/storage/list${suffix}`, { method: "GET" });
            },
            buckets() {
                return request("/v1/storage/buckets", { method: "GET" });
            },
            downloadText(params) {
                const qs = new URLSearchParams();
                qs.set("bucket", params.bucket ?? "public");
                qs.set("key", params.key);
                return requestText(`/v1/storage/object?${qs.toString()}`, { method: "GET" });
            },
            downloadBytes(params) {
                const qs = new URLSearchParams();
                qs.set("bucket", params.bucket ?? "public");
                qs.set("key", params.key);
                return requestBytes(`/v1/storage/object?${qs.toString()}`, { method: "GET" });
            },
            delete(params) {
                return request("/v1/storage/delete", {
                    method: "POST",
                    body: JSON.stringify({ bucket: params.bucket ?? "public", key: params.key })
                });
            },
            signDownload(params) {
                return request("/v1/storage/sign-download", {
                    method: "POST",
                    body: JSON.stringify({
                        bucket: params.bucket ?? "public",
                        key: params.key,
                        expires_in: params.expiresIn ?? 600
                    })
                });
            },
            signedDownloadURL(token) {
                const t = encodeURIComponent(token);
                return `${base}/v1/storage/signed-download?token=${t}`;
            },
            downloadSignedText(token) {
                const t = encodeURIComponent(token);
                return requestText(`/v1/storage/signed-download?token=${t}`, { method: "GET" }, false);
            },
            async downloadSignedBytes(token) {
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
                return request(`/v1/functions?limit=${limit}`, { method: "GET" });
            },
            create(params) {
                return request("/v1/functions", {
                    method: "POST",
                    body: JSON.stringify(params)
                });
            },
            get(name) {
                return request(`/v1/functions/${encodeURIComponent(name)}`, { method: "GET" });
            },
            delete(name) {
                return request(`/v1/functions/${encodeURIComponent(name)}`, { method: "DELETE" });
            },
            invoke(name, payload = {}) {
                return request(`/v1/functions/${encodeURIComponent(name)}/invoke`, {
                    method: "POST",
                    body: JSON.stringify({ payload })
                });
            },
        },
        // ── Secrets ──────────────────────────────────────────────────────
        secrets: {
            list(limit = 200) {
                return request(`/v1/secrets?limit=${limit}`, { method: "GET" });
            },
            create(name, value) {
                return request("/v1/secrets", {
                    method: "POST",
                    body: JSON.stringify({ name, value })
                });
            },
            get(name) {
                return request(`/v1/secrets/${encodeURIComponent(name)}`, { method: "GET" });
            },
            delete(name) {
                return request(`/v1/secrets/${encodeURIComponent(name)}`, { method: "DELETE" });
            },
        },
        // ── Email Templates ──────────────────────────────────────────────
        email: {
            templates: {
                list(limit = 200) {
                    return request(`/v1/email/templates?limit=${limit}`, { method: "GET" });
                },
                create(params) {
                    return request("/v1/email/templates", {
                        method: "POST",
                        body: JSON.stringify(params)
                    });
                },
                get(name) {
                    return request(`/v1/email/templates/${encodeURIComponent(name)}`, { method: "GET" });
                },
                delete(name) {
                    return request(`/v1/email/templates/${encodeURIComponent(name)}`, { method: "DELETE" });
                },
            },
        },
        // ── AI ────────────────────────────────────────────────────────────
        ai: {
            configs: {
                list(limit = 200) {
                    return request(`/v1/ai/configs?limit=${limit}`, { method: "GET" });
                },
                create(params) {
                    return request("/v1/ai/configs", {
                        method: "POST",
                        body: JSON.stringify(params)
                    });
                },
                get(name) {
                    return request(`/v1/ai/configs/${encodeURIComponent(name)}`, { method: "GET" });
                },
                delete(name) {
                    return request(`/v1/ai/configs/${encodeURIComponent(name)}`, { method: "DELETE" });
                },
            },
            chat(params) {
                return request("/v1/ai/chat", {
                    method: "POST",
                    body: JSON.stringify({ ...params, stream: false })
                });
            },
            embeddings(params) {
                return request("/v1/ai/embeddings", {
                    method: "POST",
                    body: JSON.stringify(params)
                });
            },
            usage(period) {
                const suffix = period ? `?period=${period}` : "";
                return request(`/v1/ai/usage${suffix}`, { method: "GET" });
            },
        },
        // ── Logs ──────────────────────────────────────────────────────────
        logs: {
            async list(params = {}) {
                const qs = new URLSearchParams();
                if (params.limit)
                    qs.set("limit", String(params.limit));
                if (params.period)
                    qs.set("period", params.period);
                if (params.cursor)
                    qs.set("cursor", params.cursor);
                if (params.type)
                    qs.set("type", params.type);
                if (params.level)
                    qs.set("level", params.level);
                if (params.search)
                    qs.set("search", params.search);
                const suffix = qs.toString() ? `?${qs.toString()}` : "";
                // Backend returns { data: LogEntry[], meta: { next_cursor } } —
                // request() only unwraps "data", so we call it for the items and
                // lose meta. Use requestFull to preserve the full body.
                const headers = new Headers({ apikey: key });
                if (accessToken)
                    headers.set("Authorization", `Bearer ${accessToken}`);
                const response = await fetchImpl(`${base}/v1/logs${suffix}`, { method: "GET", headers });
                const body = await parseJSON(response);
                if (!response.ok) {
                    const normalized = normalizeErrorBody(body);
                    throw new AppBackendError(response.status, body, normalized.message, normalized.code);
                }
                return {
                    items: Array.isArray(body?.data) ? body.data : [],
                    meta: body?.meta,
                };
            },
        },
    };
}
export function createBrowserClientFromEnv(env, opts = {}) {
    const cfg = opts.config;
    const baseURL = ensureNonEmpty("NEXT_PUBLIC_APP_BACKEND_URL", env.NEXT_PUBLIC_APP_BACKEND_URL ?? cfg?.backend_url ?? "");
    const anonKey = ensureNonEmpty("NEXT_PUBLIC_APP_ANON_KEY", env.NEXT_PUBLIC_APP_ANON_KEY ?? cfg?.anon_key ?? "");
    return createClient(baseURL, anonKey, opts);
}
export function createServerClientFromEnv(env, opts = {}) {
    const cfg = opts.config;
    const baseURL = ensureNonEmpty("APP_BACKEND_URL", env.APP_BACKEND_URL ?? cfg?.backend_url ?? "");
    const serviceKey = ensureNonEmpty("APP_SERVICE_KEY", env.APP_SERVICE_KEY ?? "");
    return createClient(baseURL, serviceKey, opts);
}
