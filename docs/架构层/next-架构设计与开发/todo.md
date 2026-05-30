# todo

@伟鹏 二次开发的时候 比对 mock server  和 mock api 方案哪个好

- 去页面查看业务，然后分析需要的基建

# 公共能力建设





## p1 权限 coc 集成


基于coc 采集考虑 基础鉴权工具是否要改变


- [ ] 权限 coc https://newlandnpt.feishu.cn/wiki/REL4wq5PPiJVLskp3RicDwiLnmd




## 异常处理

### 前端异常兜底
### 后端异常兜底

## 统一配置入口


## --------

##  withapi 

- traceId
- 鉴权
- 日志
  - 统一格式 + 统一采集
- 捕获统一错误码
- 超时
- 限流








##   限流

| 限流参数       | 可配置                        |   ip + token   endpoint

## 超时控制

## 慢查询监控

type LatencyClass =
  | "normal"      // 普通接口：> 500ms 慢
  | "query"       // 查询接口：> 800ms 慢
  | "export"      // 导出接口：不按普通接口算
  | "upload"      // 上传接口：按文件大小算
  | "long_lived"  // SSE / WebSocket
  | "external"    // 依赖第三方
  | "async_job";  // 异步任务


## 统一响应结构

1. 对象
2. 分页 游标
3. 失败



## 统一错误码

## 统一日志

采集， 格式化， 输出

| 日志采集 + 日志持久化             | 不随容器丢失                |
  - 日志
结构化日志、request id、错误追踪、

logger 统一格式 + 审计转换



  统一日志 格式 + 采集


## 国际化

next 前后端 语言国际化，兜底，初始值获取 国际化miss扫描， embed


根据客户浏览器的时区进行设置， 首次进入如果 cookies 没有 时区参数，将 `route.refresh()` 刷新页面

语言， 按需，按模块加载
时间
数字 ？？ 怎么处理


## -----------------


## 审计日志占位

审计日志需要的字段获取来源


### OPERATION_LOG

| 字段 | 说明 |
|--------|--------|
| OPERATION_LOG_ID | PRIMARY KEY |
| TRACE_ID | 请求链路 ID，方便关联同一次请求的多条日志 |
| USER_ID | 操作用户 ID（可为 NULL，表示系统自动触发） |
| OPERATOR_NAME | 冗余存操作人姓名，防止用户改名后历史记录失真 |
| OPERATOR_IP | 操作来源 IP |
| PARTNER_ID | 操作人所属主体 ID |
| ACTION | 操作动作，枚举；根据不同业务可考虑使用 PERMISSION_CODE |
| TARGET_TYPE | 被操作对象类型，例如：PARTNER / CONTRACT / USER / ROLE / DELEGATION |
| TARGET_ID | 被操作对象主键 ID |
| RESULT | ENUM：SUCCESS / FAILURE |
| FAILURE_REASON | 失败原因描述 |
| DETAIL | JSONB，补充上下文，例如邀请邮箱、契约变更具体条款等 |
| CREATED_AT | 记录时间（不叫 operated_at，因为日志写入即是操作时间） |

## 异步任务,外部任务



### 邀请 / 注册 / 找回密码闭环

当前有 SysInvite、SysPasswordResetRequest 模型和部分用户邀请 API，但缺 /invite 接受流程、邮件发送、用户注册/绑定、忘记密码入口。
这块不完整的话，用户管理只能算半成品。

### 实时通信 实时状态同步

| 名词                             | 描述            | 技术                     |
| ------------------------------ | ------------- | ---------------------- |
| 实时通信 (Realtime Communication)  | 服务端主动通知客户端    | WSS、SSE                |
| 实时状态同步 (Realtime Sync)         | 保证客户端状态与服务端一致 | WSS、SSE、MQTT           |
| 消息推送 (Push Notification)       | 服务端主动推送消息     | WSS、SSE                |
| 事件驱动 (Event Driven)            | 状态变化触发通知      | MQ、Redis Pub/Sub、Kafka |
| 长轮询 (Long Polling)             | 伪实时方案         | HTTP Long Polling      |
| 短轮询 (Polling)                  | 定时查询结果        | setInterval + API      |
| 异步任务回调 (Async Callback)        | 任务完成后通知       | Webhook、MQ             |
| 任务进度跟踪 (Job Progress Tracking) | 查询任务执行进度      | Polling、SSE、WSS        |
| 实时监控 (Realtime Monitoring)     | 设备/系统状态同步     | SSE、WSS、MQTT           |


### 异步任务设计

sse + redis pub sub 公共实例


外部调用设计



rest client 封装

| 能力     | 作用                                          |
| ------ | ------------------------------------------- |
| 统一请求封装 | 统一 baseURL、headers、timeout、traceId、鉴权 token |
| 限流     | 控制调用频率，避免把外部服务打爆，也避免自己被封禁                   |
| 熔断     | 外部服务持续失败时，短时间内直接拒绝请求，保护自己系统                 |
| 重试     | 网络抖动、超时、502/503/504 时自动重试                   |
| 超时控制   | 防止外部接口卡死拖垮业务请求                              |
| 错误转换   | 把外部 API 错误统一转成系统内部错误码                       |
| 日志与监控  | 记录请求耗时、状态码、失败原因、traceId                     |
| 降级处理   | 外部服务不可用时返回兜底结果，或进入异步补偿                      |


next 实时状态状态、实时通信方案设计


wss + sse + webrtc


批量导入
批量导出
设备批量操作
消息通知
报表生成
文件处理


异步任务 / 定时任务
邮件发送、通知推送、文件处理、数据导入导出、过期邀请清理、审计归档都不应该塞在请求链路里。
建议后续加 packages/jobs，底层可以先用 Redis queue 或轻量任务表，不必一开始上很重的工作流引擎。

异步任务通用的订阅通知架构


- redis 事务锁  多实例的情况


异步任务设计

- 定时任务调用规范
- 异步任务调用规范
- 飞书/slack 通知
- 邮件
- 文件上传
  - 导入
  - 导入导出
  - 错误行报告
- Excel 导出
- 批量设备推送
- 邮件 / 短信发送
- Webhook 回调
- 批量同步外部系统
- 设备升级任务
- 长时间报表生成
消息通知


消息通知体系
站内通知、站内信 邮件通知、模板管理、发送记录、重试机制。
现在有通知铃铛占位，也有 invite/reset 表，但没有完整邮件发送和通知后端。


### s3/oss 文件上传



存储场景：
- 开放的url;
- 临时的存储；
- 持久存储，以及通过资源路径获取url；


device-firmware  设备升级包
device-log       设备日志
excel-import     批量导入
report           报表
contract         合同/协议
user-avatar      用户头像
org-logo         组织/租户 logo



上传， 获取


这套 STS 流程可以理解成“后端拿正式证件，前端拿临时通行证”。
现在你这个项目里的链路是这样：
1. 前端选文件
    - 你在 /oss-debug 里选一个文件
    - 页面准备上传请求
2. 前端先找你自己的后端要“临时上传资格”
    - 浏览器请求 Merchant 的 /api/oss/sts
    - 会把文件名、大小、目录前缀这些信息发给后端
3. 后端生成对象 key，并向阿里云 STS 申请临时凭证
    - 后端读取 .env 里的长期：
        - ALIYUN_OSS_ACCESS_KEY_ID
        - ALIYUN_OSS_ACCESS_KEY_SECRET
    - 这组长期密钥只在服务端使用
    - 后端再拿 ALIYUN_OSS_STS_ROLE_ARN 去调用 AssumeRole
    - 阿里云返回一组临时凭证：
        - 临时 AccessKeyId
        - 临时 AccessKeySecret
        - SecurityToken
        - 过期时间
4. 后端把临时凭证返回给前端
    - 同时还会把本次上传对应的 objectKey 一起返回
    - 前端拿到的不是长期密钥，而是短时间有效的一次性凭证
5. 前端直接上传到 OSS
    - 浏览器使用这组临时凭证
    - 直接把文件传到 OSS
    - 文件内容不经过你的 Next.js 服务器
OSS 验证临时凭证
如果这个临时凭证有权限上传这个路径，就上传成功
如果没权限、CORS 不对、域名不对，就失败



## oauth 仅登录授权

1. 登录 新账号并同意
2. 登录 已有账号，同意添加新公司
3. 登录 已有账号，不同意新公司， 切换账号授权



## p3 统一 流水号工具




# next 框架工程化支持


## todo codespace devcontainer 配置


## todo graceful 优雅关闭


## TODO 脚手架

- next 脚手架初始化项目
- next 脚手架更新项目
- next 脚手架持续迭代规范



## p3 next 服务健康检查 接口


- /api/health/live  提供给render 证明 app 存活
- /api/health/ready 提供给 观测平台 证明 app 和外部服务连接（数据库 redis s3） 正常






# next-kit 规约

## 项目结构 和 代码风格

## 组件样式

## 公共库引用


# TODO 文档建设

- 项目上手文档教程（环境 + 工具 + 初始化）

- 项目结构设计文档 技术栈选型 注意事项


