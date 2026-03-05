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
        message: {
            role: string;
            content: string;
        };
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
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
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
export declare class AppBackendError extends Error {
    readonly status: number;
    readonly body: unknown;
    readonly code?: string;
    constructor(status: number, body: unknown, message?: string, code?: string);
}
export type ClientOptions = {
    accessToken?: string;
    fetchImpl?: typeof fetch;
};
export type BackendConfig = {
    app_id: string;
    backend_url: string;
    anon_key: string;
};
export type BrowserEnv = {
    NEXT_PUBLIC_APP_BACKEND_URL?: string;
    NEXT_PUBLIC_APP_ANON_KEY?: string;
};
export type ServerEnv = {
    APP_BACKEND_URL?: string;
    APP_SERVICE_KEY?: string;
};
export declare function isAppBackendError(err: unknown): err is AppBackendError;
export declare function createClient(baseURL: string, apiKey: string, opts?: ClientOptions): {
    setAccessToken(token: string): void;
    auth: {
        register(email: string, password: string, metadata?: Record<string, unknown>): Promise<AuthPayload>;
        login(email: string, password: string): Promise<AuthPayload>;
        refresh(refreshToken: string): Promise<AuthPayload>;
        me(): Promise<{
            user: AppUser;
        }>;
        users: {
            list(params?: {
                limit?: number;
                offset?: number;
                search?: string;
            }): Promise<{
                items: AppUser[];
            }>;
            create(email: string, password: string, metadata?: Record<string, unknown>): Promise<{
                user: AppUser;
            }>;
        };
        settings: {
            get(): Promise<AuthSettings>;
            update(settings: Partial<Omit<AuthSettings, "updated_at">>): Promise<AuthSettings>;
        };
    };
    db: {
        from: (table: string) => {
            select(params?: Record<string, string>): Promise<DBQueryResult>;
            insert(payload: Record<string, unknown>): Promise<DBQueryResult>;
            update(payload: Record<string, unknown>, filters: Record<string, string>): Promise<DBQueryResult>;
            delete(filters: Record<string, string>): Promise<DBQueryResult>;
        };
        query(query: string, args?: unknown[]): Promise<DBQueryResult>;
        rpc(functionName: string, args?: unknown[]): Promise<DBQueryResult>;
        schema(): Promise<DBQueryResult>;
        migrations: {
            list(): Promise<{
                items: Array<Record<string, unknown>>;
            }>;
            run(migrations: MigrationInput[]): Promise<{
                applied: Array<Record<string, unknown>>;
            }>;
            rollback(steps?: number): Promise<{
                rolled_back: Array<Record<string, unknown>>;
            }>;
        };
    };
    storage: {
        uploadBase64(params: {
            bucket?: string;
            key: string;
            contentType?: string;
            dataBase64: string;
        }): Promise<StorageObject>;
        upload(params: {
            bucket?: string;
            key: string;
            contentType?: string;
            data: Uint8Array;
        }): Promise<StorageObject>;
        list(params?: {
            bucket?: string;
            prefix?: string;
            limit?: number;
        }): Promise<{
            items: StorageObject[];
        }>;
        buckets(): Promise<{
            buckets: string[];
        }>;
        downloadText(params: {
            bucket?: string;
            key: string;
        }): Promise<string>;
        downloadBytes(params: {
            bucket?: string;
            key: string;
        }): Promise<Uint8Array<ArrayBufferLike>>;
        delete(params: {
            bucket?: string;
            key: string;
        }): Promise<{
            deleted: boolean;
        }>;
        signDownload(params: {
            bucket?: string;
            key: string;
            expiresIn?: number;
        }): Promise<{
            token: string;
            url: string;
        }>;
        signedDownloadURL(token: string): string;
        downloadSignedText(token: string): Promise<string>;
        downloadSignedBytes(token: string): Promise<Uint8Array<ArrayBuffer>>;
    };
    functions: {
        list(limit?: number): Promise<{
            items: EdgeFunction[];
        }>;
        create(params: {
            name: string;
            runtime?: string;
            source: string;
        }): Promise<EdgeFunction>;
        get(name: string): Promise<EdgeFunction>;
        delete(name: string): Promise<{
            deleted: boolean;
        }>;
        invoke(name: string, payload?: Record<string, unknown>): Promise<FunctionInvokeResult>;
    };
    secrets: {
        list(limit?: number): Promise<{
            items: Secret[];
        }>;
        create(name: string, value: string): Promise<Secret>;
        get(name: string): Promise<Secret>;
        delete(name: string): Promise<{
            deleted: boolean;
        }>;
    };
    email: {
        templates: {
            list(limit?: number): Promise<{
                items: EmailTemplate[];
            }>;
            create(params: {
                name: string;
                subject: string;
                body_text: string;
                body_html: string;
            }): Promise<EmailTemplate>;
            get(name: string): Promise<EmailTemplate>;
            delete(name: string): Promise<{
                deleted: boolean;
            }>;
        };
    };
    ai: {
        configs: {
            list(limit?: number): Promise<{
                items: AIConfig[];
            }>;
            create(params: {
                name: string;
                provider: string;
                model: string;
                base_url?: string;
                secret_name: string;
                default_config?: boolean;
            }): Promise<AIConfig>;
            get(name: string): Promise<AIConfig>;
            delete(name: string): Promise<{
                deleted: boolean;
            }>;
        };
        chat(params: {
            config?: string;
            model?: string;
            messages: AIChatMessage[];
            temperature?: number;
            max_tokens?: number;
        }): Promise<AIChatResponse>;
        embeddings(params: {
            config?: string;
            model?: string;
            input: string | string[];
        }): Promise<AIEmbeddingsResponse>;
        usage(period?: "1h" | "24h" | "7d" | "30d"): Promise<AIUsage>;
    };
    logs: {
        list(params?: {
            limit?: number;
            period?: "1h" | "24h" | "7d" | "30d";
            cursor?: string;
            type?: string;
            level?: string;
            search?: string;
        }): Promise<{
            items: LogEntry[];
            meta?: {
                next_cursor?: string;
            };
        }>;
    };
};
export declare function createBrowserClientFromEnv(env: BrowserEnv, opts?: ClientOptions & {
    config?: BackendConfig;
}): {
    setAccessToken(token: string): void;
    auth: {
        register(email: string, password: string, metadata?: Record<string, unknown>): Promise<AuthPayload>;
        login(email: string, password: string): Promise<AuthPayload>;
        refresh(refreshToken: string): Promise<AuthPayload>;
        me(): Promise<{
            user: AppUser;
        }>;
        users: {
            list(params?: {
                limit?: number;
                offset?: number;
                search?: string;
            }): Promise<{
                items: AppUser[];
            }>;
            create(email: string, password: string, metadata?: Record<string, unknown>): Promise<{
                user: AppUser;
            }>;
        };
        settings: {
            get(): Promise<AuthSettings>;
            update(settings: Partial<Omit<AuthSettings, "updated_at">>): Promise<AuthSettings>;
        };
    };
    db: {
        from: (table: string) => {
            select(params?: Record<string, string>): Promise<DBQueryResult>;
            insert(payload: Record<string, unknown>): Promise<DBQueryResult>;
            update(payload: Record<string, unknown>, filters: Record<string, string>): Promise<DBQueryResult>;
            delete(filters: Record<string, string>): Promise<DBQueryResult>;
        };
        query(query: string, args?: unknown[]): Promise<DBQueryResult>;
        rpc(functionName: string, args?: unknown[]): Promise<DBQueryResult>;
        schema(): Promise<DBQueryResult>;
        migrations: {
            list(): Promise<{
                items: Array<Record<string, unknown>>;
            }>;
            run(migrations: MigrationInput[]): Promise<{
                applied: Array<Record<string, unknown>>;
            }>;
            rollback(steps?: number): Promise<{
                rolled_back: Array<Record<string, unknown>>;
            }>;
        };
    };
    storage: {
        uploadBase64(params: {
            bucket?: string;
            key: string;
            contentType?: string;
            dataBase64: string;
        }): Promise<StorageObject>;
        upload(params: {
            bucket?: string;
            key: string;
            contentType?: string;
            data: Uint8Array;
        }): Promise<StorageObject>;
        list(params?: {
            bucket?: string;
            prefix?: string;
            limit?: number;
        }): Promise<{
            items: StorageObject[];
        }>;
        buckets(): Promise<{
            buckets: string[];
        }>;
        downloadText(params: {
            bucket?: string;
            key: string;
        }): Promise<string>;
        downloadBytes(params: {
            bucket?: string;
            key: string;
        }): Promise<Uint8Array<ArrayBufferLike>>;
        delete(params: {
            bucket?: string;
            key: string;
        }): Promise<{
            deleted: boolean;
        }>;
        signDownload(params: {
            bucket?: string;
            key: string;
            expiresIn?: number;
        }): Promise<{
            token: string;
            url: string;
        }>;
        signedDownloadURL(token: string): string;
        downloadSignedText(token: string): Promise<string>;
        downloadSignedBytes(token: string): Promise<Uint8Array<ArrayBuffer>>;
    };
    functions: {
        list(limit?: number): Promise<{
            items: EdgeFunction[];
        }>;
        create(params: {
            name: string;
            runtime?: string;
            source: string;
        }): Promise<EdgeFunction>;
        get(name: string): Promise<EdgeFunction>;
        delete(name: string): Promise<{
            deleted: boolean;
        }>;
        invoke(name: string, payload?: Record<string, unknown>): Promise<FunctionInvokeResult>;
    };
    secrets: {
        list(limit?: number): Promise<{
            items: Secret[];
        }>;
        create(name: string, value: string): Promise<Secret>;
        get(name: string): Promise<Secret>;
        delete(name: string): Promise<{
            deleted: boolean;
        }>;
    };
    email: {
        templates: {
            list(limit?: number): Promise<{
                items: EmailTemplate[];
            }>;
            create(params: {
                name: string;
                subject: string;
                body_text: string;
                body_html: string;
            }): Promise<EmailTemplate>;
            get(name: string): Promise<EmailTemplate>;
            delete(name: string): Promise<{
                deleted: boolean;
            }>;
        };
    };
    ai: {
        configs: {
            list(limit?: number): Promise<{
                items: AIConfig[];
            }>;
            create(params: {
                name: string;
                provider: string;
                model: string;
                base_url?: string;
                secret_name: string;
                default_config?: boolean;
            }): Promise<AIConfig>;
            get(name: string): Promise<AIConfig>;
            delete(name: string): Promise<{
                deleted: boolean;
            }>;
        };
        chat(params: {
            config?: string;
            model?: string;
            messages: AIChatMessage[];
            temperature?: number;
            max_tokens?: number;
        }): Promise<AIChatResponse>;
        embeddings(params: {
            config?: string;
            model?: string;
            input: string | string[];
        }): Promise<AIEmbeddingsResponse>;
        usage(period?: "1h" | "24h" | "7d" | "30d"): Promise<AIUsage>;
    };
    logs: {
        list(params?: {
            limit?: number;
            period?: "1h" | "24h" | "7d" | "30d";
            cursor?: string;
            type?: string;
            level?: string;
            search?: string;
        }): Promise<{
            items: LogEntry[];
            meta?: {
                next_cursor?: string;
            };
        }>;
    };
};
export declare function createServerClientFromEnv(env: ServerEnv, opts?: ClientOptions & {
    config?: BackendConfig;
}): {
    setAccessToken(token: string): void;
    auth: {
        register(email: string, password: string, metadata?: Record<string, unknown>): Promise<AuthPayload>;
        login(email: string, password: string): Promise<AuthPayload>;
        refresh(refreshToken: string): Promise<AuthPayload>;
        me(): Promise<{
            user: AppUser;
        }>;
        users: {
            list(params?: {
                limit?: number;
                offset?: number;
                search?: string;
            }): Promise<{
                items: AppUser[];
            }>;
            create(email: string, password: string, metadata?: Record<string, unknown>): Promise<{
                user: AppUser;
            }>;
        };
        settings: {
            get(): Promise<AuthSettings>;
            update(settings: Partial<Omit<AuthSettings, "updated_at">>): Promise<AuthSettings>;
        };
    };
    db: {
        from: (table: string) => {
            select(params?: Record<string, string>): Promise<DBQueryResult>;
            insert(payload: Record<string, unknown>): Promise<DBQueryResult>;
            update(payload: Record<string, unknown>, filters: Record<string, string>): Promise<DBQueryResult>;
            delete(filters: Record<string, string>): Promise<DBQueryResult>;
        };
        query(query: string, args?: unknown[]): Promise<DBQueryResult>;
        rpc(functionName: string, args?: unknown[]): Promise<DBQueryResult>;
        schema(): Promise<DBQueryResult>;
        migrations: {
            list(): Promise<{
                items: Array<Record<string, unknown>>;
            }>;
            run(migrations: MigrationInput[]): Promise<{
                applied: Array<Record<string, unknown>>;
            }>;
            rollback(steps?: number): Promise<{
                rolled_back: Array<Record<string, unknown>>;
            }>;
        };
    };
    storage: {
        uploadBase64(params: {
            bucket?: string;
            key: string;
            contentType?: string;
            dataBase64: string;
        }): Promise<StorageObject>;
        upload(params: {
            bucket?: string;
            key: string;
            contentType?: string;
            data: Uint8Array;
        }): Promise<StorageObject>;
        list(params?: {
            bucket?: string;
            prefix?: string;
            limit?: number;
        }): Promise<{
            items: StorageObject[];
        }>;
        buckets(): Promise<{
            buckets: string[];
        }>;
        downloadText(params: {
            bucket?: string;
            key: string;
        }): Promise<string>;
        downloadBytes(params: {
            bucket?: string;
            key: string;
        }): Promise<Uint8Array<ArrayBufferLike>>;
        delete(params: {
            bucket?: string;
            key: string;
        }): Promise<{
            deleted: boolean;
        }>;
        signDownload(params: {
            bucket?: string;
            key: string;
            expiresIn?: number;
        }): Promise<{
            token: string;
            url: string;
        }>;
        signedDownloadURL(token: string): string;
        downloadSignedText(token: string): Promise<string>;
        downloadSignedBytes(token: string): Promise<Uint8Array<ArrayBuffer>>;
    };
    functions: {
        list(limit?: number): Promise<{
            items: EdgeFunction[];
        }>;
        create(params: {
            name: string;
            runtime?: string;
            source: string;
        }): Promise<EdgeFunction>;
        get(name: string): Promise<EdgeFunction>;
        delete(name: string): Promise<{
            deleted: boolean;
        }>;
        invoke(name: string, payload?: Record<string, unknown>): Promise<FunctionInvokeResult>;
    };
    secrets: {
        list(limit?: number): Promise<{
            items: Secret[];
        }>;
        create(name: string, value: string): Promise<Secret>;
        get(name: string): Promise<Secret>;
        delete(name: string): Promise<{
            deleted: boolean;
        }>;
    };
    email: {
        templates: {
            list(limit?: number): Promise<{
                items: EmailTemplate[];
            }>;
            create(params: {
                name: string;
                subject: string;
                body_text: string;
                body_html: string;
            }): Promise<EmailTemplate>;
            get(name: string): Promise<EmailTemplate>;
            delete(name: string): Promise<{
                deleted: boolean;
            }>;
        };
    };
    ai: {
        configs: {
            list(limit?: number): Promise<{
                items: AIConfig[];
            }>;
            create(params: {
                name: string;
                provider: string;
                model: string;
                base_url?: string;
                secret_name: string;
                default_config?: boolean;
            }): Promise<AIConfig>;
            get(name: string): Promise<AIConfig>;
            delete(name: string): Promise<{
                deleted: boolean;
            }>;
        };
        chat(params: {
            config?: string;
            model?: string;
            messages: AIChatMessage[];
            temperature?: number;
            max_tokens?: number;
        }): Promise<AIChatResponse>;
        embeddings(params: {
            config?: string;
            model?: string;
            input: string | string[];
        }): Promise<AIEmbeddingsResponse>;
        usage(period?: "1h" | "24h" | "7d" | "30d"): Promise<AIUsage>;
    };
    logs: {
        list(params?: {
            limit?: number;
            period?: "1h" | "24h" | "7d" | "30d";
            cursor?: string;
            type?: string;
            level?: string;
            search?: string;
        }): Promise<{
            items: LogEntry[];
            meta?: {
                next_cursor?: string;
            };
        }>;
    };
};
//# sourceMappingURL=index.d.ts.map