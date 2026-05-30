# next.js 技术规范 约定和原因


## server actions  vs Route Handlers todo 

| 优点            | 说明                        |
| ------------- | ------------------------- |
| 开发快           | 不用手写 `fetch('/api/xxx')`  |
| 和页面结合紧密       | mutation 后可以直接 revalidate |
| 表单体验好         | `<form action={xxx}>` 很自然 |
| 少一层前后端 DTO 映射 | 页面操作可以直接调用 action         |
| 适合后台管理系统      | 很多后台操作本质就是页面按钮触发 mutation |

| 缺点                            | 影响                                                                  |
| ----------------------------- | ------------------------------------------------------------------- |
| 不是稳定 API 契约                   | 不适合给移动端、外部系统、其他服务长期调用                                               |
| 难做 OpenAPI / Postman / API 文档 | 中大型团队协作会吃亏                                                          |
| 和 Next.js / React 绑定重         | 以后迁移到 NestJS、Go、独立 API 服务会更痛                                        |
| 权限容易漏                         | 页面鉴权不等于 action 鉴权，官方也要求每个 Server Action 内部重新验证认证和授权。([Next.js][1])  |
| 大文件/复杂请求不适合                   | Server Actions 默认请求体限制是 1MB，可配置，但它不是上传、大流量 API 的最佳边界。([Next.js][2]) |
| 可观测性不如 API 清晰                 | 慢接口、trace、审计、限流、接口指标需要自己包装                                          |

[1]: https://nextjs.org/docs/app/guides/data-security?utm_source=chatgpt.com "Guides: Data Security"
[2]: https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions?utm_source=chatgpt.com "next.config.js: serverActions"



## 接口实现


1. 尽量使用 api route 
2. api route 


可以总结成这几条“军法”，直接放进 `AGENTS.md / CLAUDE.md / 项目规范` 里。

## Next.js SaaS 分层军法

### 1. Route 只做 HTTP 适配

`route.ts` 只允许做：

```txt
读取 params / query / body
zod parse
requireSession
粗粒度 auth check
调用 service
返回 response
```

**禁止在 route.ts 写复杂业务逻辑、事务、SQL、审计编排。**

---

### 2. Zod schema 放 server/domain，parse 放 route

```txt
schema 定义位置：
lib/server/<domain>/*.schema.ts

zod parse 执行位置：
app/api/**/route.ts
```

一句话：

> **schema 不散落在 route，parse 不下沉到 service。**

---

### 3. Service 只接收干净的 typed input

Service 入参必须是已经 parse 过的数据：

```ts
service({
  session,
  input,
})
```

**禁止 service 接收 `Request`、`NextRequest`、`rawBody`、`URLSearchParams`。**

---

### 4. Route 管请求合法，Service 管业务能不能做

Zod 只判断：

```txt
字段格式
枚举值
长度
分页参数
email 格式
```

Service 判断：

```txt
客户是否存在
状态能不能流转
是否跨租户
角色是否被 blacklist
合同是否有效
是否需要审计
是否需要事务
```

---

### 5. 权限必须分两层

Route 做粗权限：

```ts
assertPermissions(session, ['cust.update'])
```

Service / policy 做 scope 权限：

```ts
assertCustomerPermission(session, customerId, 'cust.update')
```

**禁止只按 permission code 判断，不判断 customerId / entityId。**

---

### 6. SQL 只负责数据库，不负责业务

`lib/sql/**` 只允许：

```txt
参数化 SQL
读写数据库
返回 typed row
```

**禁止 SQL 文件判断 session、权限、业务状态、HTTP 错误。**

---

### 7. Mutation 必须进事务，必须写审计

所有写操作必须：

```txt
prisma.$transaction
业务写入
audit_event 写入
```

尤其是：

```txt
lock / unlock
reset password
reveal sensitive field
role change
blacklist role
remove operator
terminate contract
```

**没有 audit 的 mutation 不允许合并。**

---

### 8. API 永远不能相信前端

前端按钮权限只负责显示隐藏。

真正安全必须在：

```txt
app/api/**/route.ts
lib/server/**/policy.ts
```

**禁止因为按钮隐藏了，就不在 API 校验权限。**

---

### 9. 页面只做壳，不做业务查询

Page / Layout 只做：

```txt
requireSession
页面级 assertPermissions
传递 id
渲染 Client Component
```

默认禁止：

```txt
复杂列表查询
业务 mutation
权限解析
审计写入
```

你当前设计里“Pages do not fetch data，所有数据走 app/api”的方向可以保留，但建议允许页面读取极少量稳定上下文。

---

### 10. 一句话总军法

```txt
Page 管入口。
Route 管 HTTP。
Schema 管格式。
Service 管业务。
Policy 管权限。
SQL 管数据。
Audit 管追责。
```

最核心一句：

> **Route 负责“这个 HTTP 请求是否合法”；Service 负责“这个业务动作能不能执行”。**



先鉴权再进行 zod 校验


审计字段 如果没有要求默认不要求所有表都有




## 代码 文件


没有用 requireSession 判断登录态

没有用 assertSession 判断权限

少了  error catch  补货异常错误


组件要区分公共全局组件和业务模块组件，业务模块组件做到业务路径下 `/_components` 下

应该尽力使用  cloud/ui 组件库，差异较大部分，或者高频使用的部分才重新进行封装。组合的时候也是尽力使用 cloud/ui

### 什么时候该用页面，什么时候改用

例如用户详情页面

```markdown

<!-- good -->

- 用户详情  page
  - tab 切换
  - _components
    - overview
    - Contracts
    - Operators & roles
    - History


```
```

<!-- bad -->

- 用户详情
  - layout
    - tab 切换
  - overview/page.tsx
  - Contracts/page.tsx
  - Operators & roles/page.tsx
  - History/page.tsx


```



# 2026-05-27

时间格式处理统一使用 i18n 库的配置，根据客户所在的地区进行展示
数字格式处理统一使用 i18n 库的配置，根据客户所在的地区进行展示




## 页面结构和缓存问题


```tsx
// app/(dashboard)/devices/page.tsx
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { DevicesPageClient } from "./_components/DevicesPageClient";

// 避免服务端页面缓存，并且页面内的所有请求默认不使用缓存
export const dynamic = "force-dynamic";

export default async function Page() {
  
  const session = await getSession();
  await assertPermission('permissionCode');

  return (
    <DevicesPageClient
      currentUser={{
        id: session.userId,
        tenantId: session.tenantId,
        permissions: session.permissions,
      }}
    />
  );
}

```

```jsx

"use client";


export function DevicesPageClient({ currentUser }) {
  const { data, isLoading, mutate } = fetch(
    ["/api/devices", currentUser.tenantId],
    fetcher
  );

  return (
    <DeviceTable
      data={data}
      loading={isLoading}
      onChanged={() => mutate()}
    />
  );
}

```


核心原则
1. Page 不查业务列表

不要在 page.tsx 里查设备列表、用户列表、订单列表。

否则你会被这些问题困住：

router.back() 不刷新
Router Cache 命中旧 RSC
revalidatePath 和 router.refresh 行为不一致
页面返回数据旧

官方也明确区分了 router.refresh() 和 revalidatePath()：前者清客户端 Router Cache，但不清 Data Cache / Full Route Cache；后者是服务端缓存失效。

你的模式里，业务数据走 CSR，刷新就简单很多：

mutate();              // SWR
queryClient.invalidateQueries(); // TanStack Query
2. Page 只传“安全的上下文”

可以传：

{
  userId,
  tenantId,
  orgId,
  locale,
  permissions,
}

不要传：

passwordHash
accessToken
完整用户对象
完整角色对象
敏感配置

Next 官方也强调 Server Components 下要重新考虑数据暴露边界。



##  prisma 的 schema 