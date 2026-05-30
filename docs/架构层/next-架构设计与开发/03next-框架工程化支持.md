# next 框架工程化支持

## render 部署


1. 不应该明确指定端口，由环境变量 `PORT` （render 默认是 `10000`）控制

1. 设置 `/api/healthz` 接口供健康监控
   1. 如果超过 15 秒没有健康，停止流量
   2. 如果实例连续60秒未能通过健康检查，Render会自动重启实例， 在这种情况下，Render 根据您的设置通知您
   3. https://render.com/docs/health-checks#http-health-checks-web-services-only

### 变量规定

1. 数据库 redis 设置在公共组中
2. 应用相关的变量设置在应用上，并且以应用名称开头 `NEXT_ADMIN_XXXX`
3. 不要上传 `.env` 这个环境变量到 `git` 上， 生产环境的所有变量应该从 环境中获取
4. 修改 `.env` 以后需要重新启动服务生效


### 多实例

- render 使用流量均衡策略

### 版本固化

node `v24.11.1`

pnpm `10.18.3`

提交 pnpm-lock.yaml

Dockerfile 固定 node 镜像

render 打包指令 加上 `--frozen-lockfil`

```bash

pnpm install --frozen-lockfile

```

### 仅部署改动项目

Render 端用 `Build Filter` 控制触发，构建命令用 `pnpm --filter xxx build` 控制只构建目标项目

在 render 为服务设置 filter

```YAML
services:
  - type: web
    name: admin
    env: node
    # 因为有公共 package，所以打包必须从 root 打
    rootDir: .
    buildCommand: pnpm install --frozen-lockfile && pnpm --filter admin build
    startCommand: pnpm --filter admin start
    # 除项目代码外，公共依赖变动也要触发重新部署
    buildFilter:
      paths:
        - apps/admin/**
        - packages/**
        - pnpm-lock.yaml
        - package.json
        - pnpm-workspace.yaml
```


## 数据库、redis 连接原则

多应用多实例下连接 postgresql redis 应该注意合理的分配连接数，避免将服务打满，阻塞其他的业务

### postgresql

我们购买的 postgresql 服务应该在 100个连接左右。 扣除 20个用于 采集和个人直连排查问题。 连接最多使用80个

根据应用业务量和实例数量进行分配。

```
假设：
3 个 Next.js App
每个 App 2 个实例
每个实例 Prisma connection_limit=3

总应用侧连接 ≈ 3 × 2 × 3 = 18 个连接到 PgBouncer
PgBouncer 再维护较少真实 PostgreSQL 连接

```

使用中间件 `PgBouncer` 作为连接池的中间件，作为数据库的负载中心，分配连接

> prisma 环境变量推荐

```shell
# env file
# DATABASE_URL：运行时查询，走 PgBouncer
DATABASE_URL="postgresql://user:pass@pgbouncer-host:6432/app?pgbouncer=true&connection_limit=1"
# DIRECT_URL：Prisma migration / db push / migrate deploy，直连 PostgreSQL
DIRECT_URL="postgresql://user:pass@postgres-host:5432/app"

```

#### 架构设计


> 注意 ！！！
>
> 应该统一从 package/db 中复用数据库的实例，而不要单独创建新的实例。

**实例流程**

```mermaid

flowchart LR
  subgraph NextInstance[每个 Next.js 实例]
    Req[HTTP Request]
    Route[Page / Route Handler / Server Action]
    Service[Service Layer]
    Prisma[Prisma Client Singleton]
  end

  subgraph Pool[连接层]
    PGB[PgBouncer\npool_mode=transaction]
  end

  subgraph Postgres[PostgreSQL]
    Conn[(真实 DB Connections)]
  end

  Req --> Route --> Service --> Prisma
  Prisma -->|DATABASE_URL 指向 PgBouncer| PGB
  PGB --> Conn

```
**多实例流程**

```mermaid

flowchart TB
  User[Browser / Client]

  subgraph Render[Render Platform]
    subgraph AppAService[Render Web Service: App A]
      LBA[App A Load Balancer]
      A1[Instance A-1]
      A2[Instance A-2]
      LBA --> A1
      LBA --> A2
    end

    subgraph AppBService[Render Web Service: App B]
      LBB[App B Load Balancer]
      B1[Instance B-1]
      B2[Instance B-2]
      LBB --> B1
      LBB --> B2
    end

    subgraph AppCService[Render Web Service: App C]
      LBC[App C Load Balancer]
      C1[Instance C-1]
      C2[Instance C-2]
      LBC --> C1
      LBC --> C2
    end

    PGB[PgBouncer / Render PostgreSQL Pooler]
  end

  subgraph DB[Database Layer]
    PG[(PostgreSQL)]
  end

  User --> LBA
  User --> LBB
  User --> LBC

  A1 -->|Prisma Client| PGB
  A2 -->|Prisma Client| PGB
  B1 -->|Prisma Client| PGB
  B2 -->|Prisma Client| PGB
  C1 -->|Prisma Client| PGB
  C2 -->|Prisma Client| PGB

  PGB -->|少量稳定连接| PG

```

### redis


整体流程：

1. 浏览器连接 `/api/sse/device-status`
2. Render/LB 把连接分配到某个 Next.js 实例
3. 每个实例：
   1. 维护自己的 SSE clients
   2. 只建立 1 个 redisSub
4. Worker / MQTT / API 往 Redis publish
5. Redis 把消息广播给所有 Next.js 实例
6. 每个实例只推送给自己维护的浏览器连接


```mermaid

flowchart TB

    subgraph Clients["Browser Clients"]
        B1["Browser A"]
        B2["Browser B"]
        B3["Browser C"]
        B4["Browser D"]
    end

    LB["Load Balancer / Render Routing"]

    B1 --> LB
    B2 --> LB
    B3 --> LB
    B4 --> LB

    subgraph NextCluster["Next.js Multi Instance Cluster"]

        subgraph N1["Next.js Instance 1"]
            SSE1["SSE Connections"]
            HUB1["In-Memory Clients Set"]
            SUB1["redisSub"]
        end

        subgraph N2["Next.js Instance 2"]
            SSE2["SSE Connections"]
            HUB2["In-Memory Clients Set"]
            SUB2["redisSub"]
        end

        subgraph N3["Next.js Instance 3"]
            SSE3["SSE Connections"]
            HUB3["In-Memory Clients Set"]
            SUB3["redisSub"]
        end

    end

    LB --> N1
    LB --> N2
    LB --> N3

    SSE1 --> HUB1
    SSE2 --> HUB2
    SSE3 --> HUB3

    subgraph RedisLayer["Redis"]

        PUB["Redis Publish"]
        CHANNEL["channel: device:status"]

        PUB --> CHANNEL
    end

    SUB1 --> CHANNEL
    SUB2 --> CHANNEL
    SUB3 --> CHANNEL

    subgraph Workers["MQTT / Worker / Go / NestJS"]

        MQTT["MQTT Consumer"]
        WORKER["BullMQ Worker"]
        API["Backend API"]

    end

    MQTT --> PUB
    WORKER --> PUB
    API --> PUB

    HUB1 -->|"broadcast"| SSE1
    HUB2 -->|"broadcast"| SSE2
    HUB3 -->|"broadcast"| SSE3

```



## next 多实例部署测试

[jump to](../7002多实例部署测试.md)

## next 基础业务场景并发性能测试

[jump to](../7002多实例部署测试.md)

