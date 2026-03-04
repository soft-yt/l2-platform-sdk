# @l2-platform/sdk

TypeScript SDK for L2 App Backend (BaaS).

## Install

```bash
npm install github:soft-yt/l2-platform-sdk
```

## Browser Usage

```ts
import { createBrowserClientFromEnv } from "@l2-platform/sdk";

const app = createBrowserClientFromEnv({
  NEXT_PUBLIC_APP_BACKEND_URL: process.env.NEXT_PUBLIC_APP_BACKEND_URL,
  NEXT_PUBLIC_APP_ANON_KEY: process.env.NEXT_PUBLIC_APP_ANON_KEY,
});

// Auth
const { user, access_token } = await app.auth.login("user@example.com", "password");
const { user } = await app.auth.register("new@example.com", "password");
const me = await app.auth.me();

// Database
const rows = await app.db.from("users").select();
await app.db.from("users").insert({ name: "John", email: "john@example.com" });
await app.db.from("users").update({ name: "Jane" }, { id: "eq.123" });
await app.db.from("users").delete({ id: "eq.123" });

// Raw SQL (service key recommended)
const result = await app.db.query("SELECT * FROM users WHERE age > $1", [18]);

// Storage
await app.storage.upload({ key: "photos/avatar.png", data: bytes, contentType: "image/png" });
const files = await app.storage.list({ prefix: "photos/" });
const { token, url } = await app.storage.signDownload({ key: "photos/avatar.png" });
```

## Server Usage

```ts
import { createServerClientFromEnv } from "@l2-platform/sdk";

const admin = createServerClientFromEnv({
  APP_BACKEND_URL: process.env.APP_BACKEND_URL,
  APP_SERVICE_KEY: process.env.APP_SERVICE_KEY,
});
```

## API

### Auth
- `auth.register(email, password, metadata?)` → `AuthPayload`
- `auth.login(email, password)` → `AuthPayload`
- `auth.refresh(refreshToken)` → `AuthPayload`
- `auth.me()` → `{ user: AppUser }`

### Database
- `db.from(table).select(params?)` → `DBQueryResult`
- `db.from(table).insert(data)` → `DBQueryResult`
- `db.from(table).update(data, filters)` → `DBQueryResult`
- `db.from(table).delete(filters)` → `DBQueryResult`
- `db.query(sql, args?)` → `DBQueryResult`
- `db.rpc(functionName, args?)` → `DBQueryResult`
- `db.schema()` → `DBQueryResult`

### Storage
- `storage.upload({ key, data, contentType?, bucket? })` → `StorageObject`
- `storage.uploadBase64({ key, dataBase64, contentType?, bucket? })` → `StorageObject`
- `storage.list({ prefix?, bucket?, limit? })` → `{ items: StorageObject[] }`
- `storage.downloadText({ key, bucket? })` → `string`
- `storage.downloadBytes({ key, bucket? })` → `Uint8Array`
- `storage.delete({ key, bucket? })` → `{ deleted: boolean }`
- `storage.signDownload({ key, bucket?, expiresIn? })` → `{ token, url }`

### Types
- `AppUser` — `{ id, email, metadata, created_at }`
- `AuthPayload` — `{ user, access_token, refresh_token? }`
- `DBQueryResult` — `{ columns, rows, tag }`
- `StorageObject` — `{ id, bucket, object_key, content_type, size_bytes, etag, created_at, updated_at }`
- `AppBackendError` — `{ status, body, code?, message }`

## License

MIT
