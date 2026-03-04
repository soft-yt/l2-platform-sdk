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
};
export declare function createBrowserClientFromEnv(env: BrowserEnv, opts?: ClientOptions): {
    setAccessToken(token: string): void;
    auth: {
        register(email: string, password: string, metadata?: Record<string, unknown>): Promise<AuthPayload>;
        login(email: string, password: string): Promise<AuthPayload>;
        refresh(refreshToken: string): Promise<AuthPayload>;
        me(): Promise<{
            user: AppUser;
        }>;
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
};
export declare function createServerClientFromEnv(env: ServerEnv, opts?: ClientOptions): {
    setAccessToken(token: string): void;
    auth: {
        register(email: string, password: string, metadata?: Record<string, unknown>): Promise<AuthPayload>;
        login(email: string, password: string): Promise<AuthPayload>;
        refresh(refreshToken: string): Promise<AuthPayload>;
        me(): Promise<{
            user: AppUser;
        }>;
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
};
//# sourceMappingURL=index.d.ts.map