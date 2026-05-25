# 项目上手文档（Onboarding）

> 面向第一次进入仓库的工程师。读完这一份，应能：理解 monorepo 形状、知道哪些公共包/组件可以直接复用、按规约写一条带"登录"水平的完整链路（i18n + zod 校验 + RSA + argon2 + session + 统一响应）。
>
> 更深层的"为什么"在 [`DEV_NOTE.md`](./DEV_NOTE.md)；行为准则在 [`AGENTS.md`](./AGENTS.md)；本节 §2 给出最短启动路径，[`README.md`](./README.md) 是更完整的参考。

---

## 1. 仓库形态

pnpm + workspace 单仓多包，Next.js 16 App Router + React 19。

```
apps/
  admin/        # Admin 后台（登录、退出、权限闭环已就绪 —— 本文以它为例）
  merchant/     # 商户后台骨架
  partner/      # ISV 后台

packages/
  ui/           # 基础组件 + 后台布局 + Tailwind v4 token
  i18n/         # next-intl 包装：cookie 读取、locale 切换、TZ 检测
  auth/         # Session DAL + 权限断言（server）+ <Can>/usePermissions（client）
  request/      # HTTP 统一返回 + client fetch 壳（401 全局兜底）
  security/     # RSA-OAEP（client / server）+ argon2id + 时间戳防重放
  config/       # getEnv() —— 唯一 env 入口，Zod 校验
  db/           # Prisma client 唯一入口（v7 + driver adapter）
  cache/        # Redis 单例 + kv 原语（不含 session 语义）
```

每个 app 都是独立 Next.js 进程；包间用 `workspace:*` 互引，版本锁在根 `pnpm-workspace.yaml` 的 `catalog:`。

---

## 2. 启动项目（从零到能登录）

按顺序执行，全程约 5–10 分钟。Windows 用 WSL2 或 Git Bash；Linux / macOS 直接终端。

### 2.1 前置工具

| 工具    | 版本                          | 安装                                                                                                                            |
| ------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Node.js | ≥ 20（与 `@types/node` 对齐） | [nodejs.org](https://nodejs.org/) 或 `nvm install 20`                                                                           |
| pnpm    | 10.18.3（见根 `package.json` 的 `packageManager`） | `corepack enable && corepack prepare pnpm@10.18.3 --activate`                                                                  |
| Docker  | 最新稳定版（含 Compose v2）   | macOS / Windows 装 [Docker Desktop](https://www.docker.com/products/docker-desktop)；Linux 按发行版装 `docker` + `docker compose` 插件 |
| Git     | 任意近期版本                  | 略                                                                                                                              |

确认安装：

```bash
node -v        # v20.x 或更高
pnpm -v        # 10.18.3
docker -v      # 任意
docker compose version
```

### 2.2 克隆 + 装依赖

```bash
git clone <repo-url> Cloud-Frontend
cd Cloud-Frontend
pnpm install     # 同时触发 @cloud/db 的 postinstall → prisma generate
```

`pnpm install` 会自动生成 Prisma client 到 `packages/db/generated/client/`（gitignored）。看到 `✔ Generated Prisma Client` 才算成功。

### 2.3 复制 env 模板

仓库根 + 每个要跑的 app 各一份。**根 `.env` 是必装的**（含 DB / Redis / RSA 密钥），其它 app 不跑就可以省。

```bash
cp .env.example .env
cp apps/admin/.env.example    apps/admin/.env
cp apps/partner/.env.example  apps/partner/.env       # 不跑 partner 可省
cp apps/merchant/.env.example apps/merchant/.env      # 不跑 merchant 可省
```

> Windows PowerShell：把 `cp` 换成 `Copy-Item`。

根 `.env` 模板里已经预填了一对**仅供本地的** RSA 密钥（`LOGIN_PUBLIC_KEY_PEM` / `LOGIN_PRIVATE_KEY_PEM`），开箱即用；上生产前务必跑 `pnpm keys:gen --write` 重新生成并替换。

要改端口或库名：编辑 `.env` 的 `POSTGRES_PORT` / `REDIS_PORT` / `POSTGRES_DB` / `POSTGRES_USER` / `POSTGRES_PASSWORD`，**同时**保持 `DATABASE_URL` 与这些值一致 —— `docker-compose.yml` 和 Prisma 都从同一个 `.env` 读。

### 2.4 起 Postgres + Redis

```bash
docker compose --env-file .env up -d
```

这条命令：

- 拉 `postgres:16-alpine` + `redis:7-alpine`，名字分别为 `cloud_frontend_postgres` / `cloud_frontend_redis`。
- 映射 `POSTGRES_PORT`（默认 5433）/ `REDIS_PORT`（默认 6379）到宿主机。
- 数据落 named volume `postgres_data` / `redis_data`，重启不丢。

验证：

```bash
docker compose ps          # 两个容器都应 healthy / running
docker compose logs -f     # Ctrl-C 退出，看启动日志没报错
```

> **如果改过 `POSTGRES_*` 后容器已经存在**：Postgres 只在首次初始化卷时应用这些值。要让新值生效得 `docker compose down -v` 销毁卷重来（会丢本地数据）。

### 2.5 迁移 + 种子数据

```bash
pnpm db:migrate     # prisma migrate dev → 建表 + 重新生成 client
pnpm db:seed        # 写入角色、权限、3 个 bootstrap 账号
```

种子完成后默认账号（密码统一 `ChangeMe!123`，argon2id 入库）：

| Account | Email               |
| ------- | ------------------- |
| `admin` | `admin@cloud.local` |
| `isv`   | `isv@cloud.local`   |
| `iso`   | `iso@cloud.local`   |

要换默认密码：按 `packages/db/prisma/seed.ts` 顶部注释的 one-liner 重算 hash，粘到 `DEFAULT_PASSWORD_HASH`，再跑一次 `pnpm db:seed`。

### 2.6 启动 dev server

| 命令                | 端口 | 入口                  |
| ------------------- | ---- | --------------------- |
| `pnpm dev:admin`    | 3002 | http://localhost:3002 |
| `pnpm dev:partner`  | 3000 | http://localhost:3000 |
| `pnpm dev:merchant` | 3001 | http://localhost:3001 |
| `pnpm dev`          | 3000 | partner 的别名        |

打开 http://localhost:3002/login，用 `admin / ChangeMe!123` 登录，应跳转到首页并看到 "欢迎，admin"。

### 2.7 验证

可选但推荐：

```bash
pnpm smoke:auth                     # 端到端跑 RSA + argon2 通路（不依赖浏览器）
pnpm lint && pnpm test              # 静态检查 + 单测
pnpm --filter admin e2e:install     # 首次：装 Chromium
pnpm --filter admin e2e             # Playwright 跑登录/登出/失效 sid 等场景
```

### 2.8 日常 dev 循环

```bash
pnpm dev:admin           # 起 admin
pnpm db:studio           # 可选：起 Prisma Studio 看库
docker compose stop      # 收工：停容器但保留数据
docker compose start     # 第二天：再起回来
```

收工不需要 `down`；`stop` 比 `down -v` 安全（后者会清空 DB / Redis 数据）。

### 2.9 排障速查

| 症状                                                       | 处理                                                                                                                            |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 启动报 `ZodError` 指明 `DATABASE_URL` / `REDIS_URL`        | 根 `.env` 漏了 / 没 `cp`；检查路径在仓库根                                                                                       |
| 启动报 `ZodError` 指明 `NEXT_PUBLIC_APP_NAME`              | 漏了 `apps/<当前 app>/.env`                                                                                                     |
| `Cannot find module '@cloud/db'` / 找不到 `PrismaClient`   | `pnpm db:generate` 重新生成；确认 `packages/db/generated/client/` 存在                                                          |
| `connect ECONNREFUSED 127.0.0.1:5433`                      | `docker compose ps` 看 postgres 容器在不在；端口是否与 `.env` 的 `POSTGRES_PORT` 一致                                            |
| 登录页 `GET /api/auth/public-key` 500                      | 根 `.env` 缺 `LOGIN_PUBLIC_KEY_PEM`；改完 env 后没重启 dev server                                                                |
| 登录后立刻被踢回 `/login`                                  | Redis 容器没起 / `REDIS_URL` 不对；`docker compose logs redis` 看一眼                                                            |
| `Argon2 native binding` 不可用                             | `pnpm-workspace.yaml` 的 `onlyBuiltDependencies` 必须含 `argon2`；重跑 `pnpm install --force`                                    |
| 改了 `POSTGRES_PASSWORD` 但连不上                          | 卷已初始化过，新口令没生效。`docker compose down -v && docker compose up -d`（**清空本地数据**），再 `pnpm db:migrate && pnpm db:seed` |

更深的环境/密钥/Session 排障见 [`DEV_NOTE.md`](./DEV_NOTE.md)。

---

## 3. 公共规约速查

| 规约          | 单点入口                                      | 关键点                                                                                          |
| ------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Env           | `import { getEnv } from "@cloud/config"`      | 缺 key 启动期 ZodError；分层加载见 DEV_NOTE「Env 分层」                                         |
| 数据库        | `import { prisma } from "@cloud/db"`          | 禁止直 import `@prisma/client` 或 `@cloud/db/generated/*`                                       |
| Session       | `import { requireSession } from "@cloud/auth"` | 页面 / Action / Route Handler 都调它；失效会 redirect `/api/auth/logout`                       |
| 权限（服务端）| `requirePermissions({ all: [...] })` 等       | 401 → `/api/auth/logout`，403 → `/403`                                                          |
| 权限（客户端）| `<Can all={[...]}>`、`useCan(...)`            | 由 `(authed)/layout.tsx` 注入 `<PermissionsProvider>`                                           |
| HTTP 响应（server）| `@cloud/request/server`                   | `successResponse / errorResponse / badRequestResponse / unauthorizedResponse / ...`            |
| HTTP 调用（client）| `@cloud/request/client`                   | `request.get/post/...`；401 自动 `window.location.replace("/api/auth/logout")`                |
| i18n          | `@cloud/i18n` + `@cloud/i18n/client/server`  | locale 在 cookie；消息来自 app + ui + request 三层 `deepMerge`                                  |
| 表单/入参校验 | `zod` + `apps/<app>/lib/schema`               | `parseAllErrors`（表单/Action）、`parseOrFirstError`（Route Handler）                          |
| 加密 / 哈希   | `@cloud/security/client` + `/server`          | RSA-OAEP 走 SubtleCrypto / Node crypto；argon2id 参数硬编码                                     |

> **不要再发明轮子**：裸 `fetch`、裸 `Response.json`、自己塞 cookie、直接读 `process.env`、手写 `bcrypt`，一律先在上表里找入口。

---

## 4. 公共组件（`@cloud/ui`）

`packages/ui/src/index.ts` 一次性导出所有 token 化基础件 + 后台布局。所有组件颜色/间距/字号走设计 token（`bg-surface-*`、`text-content-*` 等），不要 arbitrary value 硬编码。修改 `@cloud/ui` 本体的额外约束见 `packages/ui/CLAUDE.md` —— 简短版："默认拒绝扩张，能复用就复用，能调参就不加变体"。

**基础控件**（节选；完整清单看 `packages/ui/src/components/ui/index.ts`）

- 表单类：`Button`、`Input`、`Textarea`、`Label`、`Field`、`Checkbox`、`RadioGroup`、`Switch`、`Select`、`Combobox`、`InputOTP`、`Slider`、`ToggleSwitch` 等
- 反馈类：`Alert`、`Toaster`（基于 sonner）、`Spinner`、`Skeleton`、`Tooltip`、`Progress`、`Badge`、`Empty`
- 容器类：`Card`、`Modal`、`Sheet`、`Drawer`、`Popover`、`HoverCard`、`Accordion`、`Collapsible`、`Tabs`、`ScrollArea`、`Resizable*`、`Separator`、`AspectRatio`
- 导航类：`NavigationMenu`、`Menubar`、`DropdownMenu`、`ContextMenu`、`Breadcrumb`、`Pagination`、`Command`、`Carousel`
- 数据类：`Table`（带 `TableColumn / SortDir`）、`Calendar`
- 主题：`ThemeProvider`、`useTheme`、`ThemeToggle`

**后台布局**（`@cloud/ui/components/layout`，根 barrel 也直接导出）：`Sidebar`、`AppHeader`、`ContentHeader`、`Layout`。

**工具**：`cn`（tailwind-merge 包装）、`ThemeProvider / useTheme`。

**i18n 资源**：`@cloud/ui/messages/<locale>.json`，由 app 的 `i18n/request.ts` deepMerge 进来（见下文）。

**消费方约束（应用层修改组件库的红线见 `packages/ui/CLAUDE.md`）**：
- 不要新增 design token 或组件 —— 先用调参 / variant 解决，过不去再找 owner。
- 业务组合放 `apps/*/components/`，不进 `@cloud/ui`。

---

## 5. 公共目录约定（admin 为例）

```
apps/admin/
  app/
    layout.tsx                # 根 layout：HTML + NextIntlClientProvider + TimeZoneInit
    (public)/                 # 路由组：不需要登录
      login/
        page.tsx              # RSC，渲染表单
        login-form.tsx        # client 表单
        actions.ts            # "use server"，loginAction
        schema/login.ts       # 业务 schema（无 barrel，直接 import）
        test/login-schema.test.ts
      api/auth/
        public-key/route.ts   # GET 公钥
        logout/route.ts       # GET/POST 销毁 session
    (authed)/                 # 路由组：layout.tsx 调 requireSession() 兜底
      layout.tsx              # 注入 <PermissionsProvider>
      page.tsx                # 首页
      api/demo/...            # 受保护的 route handlers
  lib/schema/
    index.ts                  # 通用 schema helper 的 barrel（trimmedNonEmpty / parseAllErrors / parseOrFirstError ...）
    string.ts
    validation.ts
  i18n/
    request.ts                # createI18nRequestConfig({ loadMessages })
    messages/{en,zh-CN,ja}.json
  proxy.ts                    # Next.js middleware：不做鉴权，只做静态资源排除
```

**路由组约定**：
- `(public)/...`：登录页、公钥、登出 —— 不依赖 session。
- `(authed)/...`：layout.tsx 一定要 `await requireSession()`；其下的 Server Action / Route Handler **自己再调一遍**（layout 不在 Action 调用链上）。

**proxy.ts 不做鉴权**：中间件不读 Redis，鉴权贴近数据发生。详见 DEV_NOTE「Session 与 Redis」。

---

## 6. 以"登录"贯穿全栈

把登录链路当模板。任何"表单提交 → 服务端处理 → 持久化 → 跳转"都按这个套路：

```
┌──────────── browser ─────────────┐    ┌─────── server (next) ────────┐
│ login-form.tsx                   │    │ login/actions.ts             │
│                                  │    │                              │
│ 1) parseAllErrors(form schema)  ─┼──► │                              │
│                                  │    │                              │
│ 2) GET /api/auth/public-key  ────┼──► │ public-key/route.ts          │
│    via request.get               │ ◄──┤ successResponse({publicKey}) │
│                                  │    │                              │
│ 3) rsaEncrypt({password, ts})   ─┼──► │ loginAction(formData):       │
│                                  │    │  a. parseAllErrors(input)    │
│                                  │    │  b. rsaDecrypt + 内层 schema │
│                                  │    │  c. assertFreshTimestamp     │
│                                  │    │  d. prisma.user.findUnique   │
│                                  │    │  e. verifyPassword (argon2)  │
│                                  │    │  f. createSessionFor(...)    │
│                                  │ ◄──┤  g. redirect("/")            │
│                                  │    │                              │
│ 4) field/form errors 翻译回显   │    │  失败：返回 {fieldErrors,    │
│                                  │    │           formErrors}        │
└──────────────────────────────────┘    └──────────────────────────────┘
```

下面逐段讲它涉及的每个公共规约。

### 6.1 RSC 入口 + i18n

`apps/admin/app/(public)/login/page.tsx`：

```tsx
import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("auth.login");
  return (
    <main className="...">
      <h1>{t("title")}</h1>
      <LoginForm />
    </main>
  );
}
```

- 服务端组件用 `getTranslations("namespace")`，客户端组件用 `useTranslations("namespace")`。
- 消息文件 `apps/admin/i18n/messages/<locale>.json`，命名空间按业务铺：`auth.login.*` 对齐表单文件位置。
- locale 来自 cookie（`@cloud/i18n` 的 `LOCALE_COOKIE`），由 `i18n/request.ts` 的 `createI18nRequestConfig` 读取。
- 三层消息 deepMerge，**app 覆盖 ui，ui 覆盖 request**（框架兜底）：

```ts
// apps/admin/i18n/request.ts
async function loadMessages(locale: Locale) {
  const [appMsgs, uiMsgs, requestMsgs] = await Promise.all([
    import(`./messages/${locale}.json`).then((m) => m.default),
    import(`@cloud/ui/messages/${locale}.json`).then((m) => m.default),
    import(`@cloud/request/messages/${locale}.json`).then((m) => m.default),
  ]);
  return deepMerge(deepMerge(requestMsgs, uiMsgs), appMsgs);
}
export default createI18nRequestConfig({ loadMessages });
```

- 根 `layout.tsx` 用 `<NextIntlClientProvider>` 把 messages 透到 client，并挂 `<TimeZoneInit />`（浏览器 TZ → cookie 自动同步）。
- 切语言：`<LocaleSwitcher />`（`@cloud/i18n/client`）写 cookie + `router.refresh()`。

### 6.2 Schema 与校验

**位置约定**：

- 跨模块复用的 schema → `apps/<app>/lib/schema/`，**有** `index.ts` barrel。
- 业务专属 schema → `apps/<app>/app/<path>/schema/<name>.ts`，**不写** barrel，调用方 `import "./schema/login"`。

`login/schema/login.ts`：

```ts
import { z } from "zod";
import { trimmedNonEmpty } from "../../../../lib/schema";

export type LoginErrorKey =
  | "missing" | "invalidRequest" | "invalidCredentials" | "encryptFailed";

export const loginFormSchema = z.object({
  account: trimmedNonEmpty("missing"),       // i18n key 的最后一段
  password: z.string().min(1, "missing"),
});

export const loginActionInputSchema = z.object({
  account: trimmedNonEmpty("missing"),
  encrypted: trimmedNonEmpty("missing"),
});

export const loginPayloadSchema = z.object({
  password: z.string().min(1, "invalidRequest"),
  ts: z.number().int().positive("invalidRequest"),
});
```

要点：

- **三道 schema**：表单输入（明文）→ Action 入参（密文）→ RSA 解密后再校验（密文里也可能被串改）。"不可信数据"每经过一道边界就再校验一次。
- **message = i18n key 末段**。schema 本身**不**碰翻译，由调用方 `t(\`errors.\${k}\`)` 翻译。
- 类型由 schema 反推：`type X = z.infer<typeof xSchema>`。不写第二份。
- 公共 helper：
  - `trimmedNonEmpty(msg)` —— trim 后非空，类型错和空字符串复用同一条 message。
  - `parseAllErrors(schema, input)` —— 表单 / Server Action 用；失败返回 `{ ok:false, fieldErrors, formErrors }`，方便逐字段回显。
  - `parseOrFirstError(schema, input)` —— Route Handler 用；失败只回第一条 message。

执行顺序硬规则：**zod 解析 → 鉴权 → 业务逻辑**。脏数据不进权限和 DB。

### 6.3 client 表单 + 加密 + 提交

`login-form.tsx`（精简）：

```tsx
"use client";
import { useActionState, useState, startTransition } from "react";
import { useTranslations } from "next-intl";
import { RequestError, request } from "@cloud/request/client";
import { rsaEncrypt } from "@cloud/security/client";
import { Button, Input, Label } from "@cloud/ui";
import { parseAllErrors } from "../../../lib/schema";
import { loginAction, type LoginState } from "./actions";
import { loginFormSchema, type LoginErrorKey } from "./schema/login";

let cachedPublicKey: string | null = null;
async function getPublicKey() {
  if (cachedPublicKey) return cachedPublicKey;
  const { data } = await request.get<{ publicKey: string }>("/api/auth/public-key");
  return (cachedPublicKey = data.publicKey);
}

export function LoginForm() {
  const t = useTranslations("auth.login");
  const tRoot = useTranslations();
  const [state, formAction, pending] = useActionState(loginAction, {});
  const [clientErrors, setClientErrors] = useState({ fieldErrors: {}, formErrors: [] });

  async function handleSubmit(e) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = parseAllErrors(loginFormSchema, {
      account: fd.get("account"),
      password: fd.get("password"),
    });
    if (!parsed.ok) {
      // 把 i18n key 翻译成本地文案再 setState
      // ...
      return;
    }
    try {
      const publicKey = await getPublicKey();
      const encrypted = await rsaEncrypt(
        JSON.stringify({ password: parsed.data.password, ts: Date.now() }),
        publicKey,
      );
      const submission = new FormData();
      submission.set("account", parsed.data.account);
      submission.set("encrypted", encrypted);
      startTransition(() => formAction(submission));
    } catch (err) {
      if (err instanceof RequestError && err.status === 401) return; // wrapper 已跳 logout
      const msg = err instanceof RequestError
        ? (err.body?.message ?? tRoot(`request.errors.${err.code}`))
        : t("errors.encryptFailed");
      setClientErrors({ fieldErrors: {}, formErrors: [msg] });
    }
  }

  return <form onSubmit={handleSubmit} noValidate>...</form>;
}
```

涉及到的规约：

1. **`request.*`（@cloud/request/client）是浏览器侧唯一 fetch 壳**。
   - `request.get<T>` 保留 envelope（含可选 `pager`），非 GET 自动拆 `data`。
   - 拿到 401 自动 `window.location.replace("/api/auth/logout")`，同时抛 `RequestError { status: 401 }`。调用方 catch 时**约定静默** `status === 401`，UI 不响应（避免在跳转的瞬间还 toast 一下）。
   - 其余错误（4xx ≠ 401 / 5xx / network / parse）统一抛 `RequestError`：
     - `status: 0` 表示 network 层 throw（断网 / CORS preflight）。
     - `code` ∈ `"http" | "network" | "parse" | "unknown"`，仅在 `body.message` 缺失时用于 fallback 翻译（`request.errors.http` 等）。
   - 调用方约定：

     ```ts
     try { const sb = await request.get(...); }
     catch (err) {
       if (!(err instanceof RequestError)) throw err;
       if (err.status === 401) return;
       const msg = err.body?.message ?? tRoot(`request.errors.${err.code}`);
       toast.error(msg);
     }
     ```

2. **`rsaEncrypt`（@cloud/security/client）走 Web Crypto `SubtleCrypto`**，对应服务端 `rsaDecrypt` 走 Node `crypto.privateDecrypt`。公钥通过 `/api/auth/public-key` 下发（不烘焙到 client bundle，方便轮换）。
3. **`useActionState`** 收 Server Action 的返回值；服务端错误覆盖 client 错误（最后一次操作的错误才相关）。

### 6.4 Server Action

`login/actions.ts`：

```ts
"use server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createSessionFor } from "@cloud/auth";
import { getEnv } from "@cloud/config";
import { prisma } from "@cloud/db";
import { assertFreshTimestamp, rsaDecrypt, verifyPassword } from "@cloud/security/server";
import { parseAllErrors } from "../../../lib/schema";
import { loginActionInputSchema, loginPayloadSchema, type LoginErrorKey } from "./schema/login";

export type LoginState = {
  fieldErrors?: Record<string, string[]>;
  formErrors?: string[];
};

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const t = await getTranslations("auth.login.errors");
  const translate = (keys: string[]) => keys.map((k) => t(k as LoginErrorKey));

  // 1) 入参形状
  const input = parseAllErrors(loginActionInputSchema, {
    account: formData.get("account"),
    encrypted: formData.get("encrypted"),
  });
  if (!input.ok) return { fieldErrors: mapErrors(input.fieldErrors, translate),
                          formErrors: translate(input.formErrors) };

  // 2) 解密 + 内层 schema + 新鲜度
  let payload;
  try {
    const plaintext = rsaDecrypt(input.data.encrypted, getEnv().LOGIN_PRIVATE_KEY_PEM);
    const parsed = parseAllErrors(loginPayloadSchema, JSON.parse(plaintext));
    if (!parsed.ok) return { formErrors: [t("invalidRequest")] };
    assertFreshTimestamp(parsed.data.ts);
    payload = parsed.data;
  } catch {
    return { formErrors: [t("invalidRequest")] };
  }

  // 3) 鉴权
  const user = await prisma.user.findUnique({
    where: { account: input.data.account },
    select: { id: true, account: true, email: true, password: true, permissions: true },
  });
  if (!user || !(await verifyPassword(user.password, payload.password))) {
    return { formErrors: [t("invalidCredentials")] };
  }

  // 4) Session
  await createSessionFor({
    userId: user.id, account: user.account, email: user.email, permissions: user.permissions,
  });
  redirect("/");
}
```

涉及到的规约：

- **`getEnv()`** 是 env 的唯一入口。`LOGIN_PRIVATE_KEY_PEM` 在根 `.env`，被 Zod 校验过（schema 在 `packages/config`）。缺 key 启动期就炸。
- **`rsaDecrypt`** / **`verifyPassword`** / **`assertFreshTimestamp`** 来自 `@cloud/security/server`，首行 `import "server-only"`，client component 链上一旦碰到 Next.js build 期就报错。
- **`prisma`** 从 `@cloud/db` 单点导入；禁止直 `import { PrismaClient }` 或深入 `@cloud/db/generated/*`。
- **`createSessionFor({...})`** 是 session 的唯一创建入口：生成 32B 随机 sid → Redis `set session:<sid>` (TTL 1800s) → 写 httpOnly cookie `sid`（maxAge 12h）。Redis TTL 滚动续命，cookie 不续；详情见 DEV_NOTE「Session 与 Redis」。
- 错误返回**全部翻译完再回**给客户端 —— 服务端持有 locale 上下文，client 拿到的就是终态字符串。i18n key 不外泄。

### 6.5 失败链路 / 受保护资源

**未登录访问 `/`**：
1. `(authed)/layout.tsx` 调 `await requireSession()`。
2. `getSession()` 读不到有效 sid → `requireSession()` redirect 到 `/api/auth/logout`。
3. logout route handler `destroyCurrentSession()` 清 cookie，再 redirect 到 `/login`。

为什么不直接 redirect 到 `/login`？因为 DAL 在 RSC 渲染上下文里**不能**写 cookie。统一过一次 logout handler 保证 cookie 一致。代价：一次额外 302。

**显式登出**：首页"退出登录"按钮 `<form action="/api/auth/logout" method="POST">` —— 同一个 handler 处理 GET（DAL 触发）和 POST（用户主动）。

**`getSession()` 是 React `cache()` 包裹**：同一请求内多次调用只命中一次 Redis、touch 一次 TTL。Server Action 与触发它的页面是不同请求，各自一次（这是 Next.js DAL 模式）。

### 6.6 客户端权限渲染

`(authed)/layout.tsx` 把 session 中的 `permissions` 注入 `<PermissionsProvider>`：

```tsx
import { requireSession } from "@cloud/auth";
import { PermissionsProvider } from "@cloud/auth/client";

export default async function AuthedLayout({ children }) {
  const session = await requireSession();
  return (
    <PermissionsProvider permissions={session.permissions}>{children}</PermissionsProvider>
  );
}
```

页面里：

```tsx
import { Can, useCan, usePermissions } from "@cloud/auth/client";

<Can all={["user.manage"]} fallback={<NoPermissionTip />}>
  <Button>管理用户</Button>
</Can>
```

**前端权限是 UX 优化，不是安全屏障**。任何敏感行为后端必须再用 `assertPermissions` / `requirePermissions` 验一遍。

### 6.7 受保护的 Route Handler / Server Action

Route Handler 模板：

```ts
import { AuthzError, assertPermissions } from "@cloud/auth";
import {
  forbiddenResponse, successResponse, unauthorizedResponse,
} from "@cloud/request/server";

export async function GET() {
  try {
    const session = await assertPermissions({ all: ["user.manage"] });
    // 数据库查询
    return successResponse({ /* ... */ });
  } catch (e) {
    if (e instanceof AuthzError) {
      return e.status === 401 ? await unauthorizedResponse() : await forbiddenResponse();
    }
    throw e;
  }
}
```

Server Action 模板：

```ts
"use server";
import { requirePermissions } from "@cloud/auth";

export async function doX() {
  const session = await requirePermissions({ all: ["user.manage"] });
  // 401 → redirect(/api/auth/logout)；403 → redirect(/403)，由 requirePermissions 处理
  // ...业务...
}
```

二者区别：
- Route Handler 走 HTTP 返回，401/403 直接转成响应体。
- Server Action 走 redirect。

---

## 7. 统一返回规约（@cloud/request）

**核心**：RESTful，不带业务 code。HTTP status 表达语义。

```ts
// 成功体
{ data: T, pager?: { page, limit, total, totalPages } }
// 失败体
{ message: string }
```

### Server helper 矩阵（`@cloud/request/server`）

| 用途                 | helper                                | 状态码 | 需要 await |
| -------------------- | ------------------------------------- | ------ | ---------- |
| 单资源 / 列表 + 分页 | `successResponse(data, pager?)`       | 200    | 否         |
| 新建                 | `createdResponse(data)`               | 201    | 否         |
| 无返回体             | `noContentResponse()`                 | 204    | 否         |
| 通用错误（自定义码） | `errorResponse(message, status=400)`  | 自定义 | 否         |
| 入参非法             | `badRequestResponse(message?)`        | 400    | 是         |
| 未登录               | `unauthorizedResponse(message?)`      | 401    | 是         |
| 无权限               | `forbiddenResponse(message?)`        | 403    | 是         |
| 资源不存在           | `notFoundResponse(message?)`          | 404    | 是         |

不传 message 时，4xx helper 自动从 `request.errors.<key>` namespace 取词（en/zh-CN/ja 自带，随 `loadMessages` deepMerge 进来）。要带翻译就传：

```ts
// 与 zod 衔接
const parsed = parseOrFirstError(querySchema, Object.fromEntries(searchParams));
if (!parsed.ok) return errorResponse(parsed.error); // 已翻译好的 message
```

### Client API（`@cloud/request/client`）

```ts
import { RequestError, request } from "@cloud/request/client";

// GET 保留 envelope
const { data, pager } = await request.get<User[]>("/api/users", { query: { page: 1 } });

// 非 GET 自动拆 data
const user = await request.post<User>("/api/users", { name: "x" });
await request.patch("/api/users/1", { name: "y" }, { signal: ac.signal });
```

**禁止**：业务代码裸 `fetch()` 或裸 `Response.json(...)`。

---

## 8. 写一条新链路的最短清单

以"新增一个需要 `user.manage` 权限的列表接口 + 页面"为例：

1. **Schema**：在 `apps/<app>/app/<path>/schema/<name>.ts` 写 query / body / response 的 zod schema，message 用 i18n key 末段。
2. **i18n key**：在 `apps/<app>/i18n/messages/<locale>.json` 新增 namespace；如果是通用错误，看 `@cloud/request/messages` 是否已有。
3. **Route Handler**：
   - 先 `parseOrFirstError(querySchema, ...)` 校验入参。
   - 再 `await assertPermissions({ all: ["xxx"] })`。
   - 调 `prisma.*` 取数。
   - 返回 `successResponse(data, pager?)` / `createdResponse(...)`。
   - 错误：`AuthzError` → `unauthorizedResponse / forbiddenResponse`；zod 失败 → `errorResponse(parsed.error)`。
4. **Server Action**（如果是表单/突变）：
   - 用 `requirePermissions(...)`（401/403 自动跳）。
   - 同样 `parseAllErrors` 校验入参，失败返回 `{ fieldErrors, formErrors }`。
   - 成功 `redirect(...)` 或返回 `{ ok: true }`。
5. **Client 页面**：
   - RSC 用 `getTranslations`；Client Component 用 `useTranslations`。
   - 表单：`useActionState` + `parseAllErrors` 做前置校验，然后 `formAction(fd)`。
   - 拉数据：`request.get/post/...`，按"调用方约定"处理 `RequestError`。
   - 权限渲染：`<Can all={[...]}>...</Can>`。
6. **测试**：
   - 单测：放在 `__/test/__/<name>.test.ts`，跑 `pnpm test`。
   - E2E：`apps/admin/e2e/`，跑 `pnpm --filter admin e2e`。
7. **完成自检**：
   - `pnpm lint && pnpm format:check && pnpm test`
   - `pnpm --filter <app> build`
   - 如果碰过 auth 链路：`pnpm smoke:auth`

---

## 9. 边界与红线

- **不要在 middleware（`proxy.ts`）里读 Redis 或写鉴权**。鉴权贴近数据。
- **不要把私钥相关代码用到 client component**。`@cloud/security/server` 顶部 `import "server-only"` 会在 build 期阻断；但你也别绕。
- **不要直接 `import { PrismaClient }` 或深入 `@cloud/db/generated/*`**。所有 DB 访问走 `import { prisma } from "@cloud/db"`。
- **不要在 `apps/*` 里写 `process.env.XXX`**。走 `getEnv()`；新增 env 必须在 `packages/config` 的 schema 上加。
- **不要新增 `@cloud/ui` 的 design token / 组件**，先看现有能不能调参覆盖；要扩先找 owner（见 `packages/ui/CLAUDE.md`）。
- **不要为了"以防万一"加防御代码、加 try/catch 吞错、加 fallback 文案**。马奇诺防线没意义（AGENTS.md 总则）。

---

## 10. 进一步阅读

| 想了解的事                         | 看哪儿                                                                |
| ---------------------------------- | --------------------------------------------------------------------- |
| 启动 / 端口 / 默认账号             | [`README.md`](./README.md)                                            |
| Prisma v7 / driver adapter / 多人协作 | [`DEV_NOTE.md`](./DEV_NOTE.md) §Prisma                                |
| Env 分层加载顺序 / 排障            | [`DEV_NOTE.md`](./DEV_NOTE.md) §Env                                  |
| RSA / argon2 / smoke 流程          | [`DEV_NOTE.md`](./DEV_NOTE.md) §Auth                                 |
| Session / Redis / cookie 双 TTL    | [`DEV_NOTE.md`](./DEV_NOTE.md) §Session                              |
| Zod / 响应外壳决策                 | [`DEV_NOTE.md`](./DEV_NOTE.md) §Zod、§HTTP 响应                       |
| 行为准则（AI 也读这份）            | [`AGENTS.md`](./AGENTS.md)                                            |
| `@cloud/ui` 修改红线               | [`packages/ui/CLAUDE.md`](./packages/ui/CLAUDE.md)                    |
