# todo 清单

外部 有一个按钮， 可以 将当前页面产生markdown
随时唤起一个 ai 对话框
  本身可以加载当前的页面上下文
  对当前的业务进行操作， （可能直接写库）

## 基建


todo WebSocket / SSE
连接在 A，事件发布在 B，前端收不到
用 Redis Pub/Sub、消息队列，或独立实时服务



| todo  用不用 ❗️ORM       | Prisma / TypeORM                                |


Graceful Shutdown | 优雅关闭

| 日志采集 + 日志持久化             | 不随容器丢失                |

- [ ] nextjs  文件上传   formdata 形势
- [ ] nextjs wss  实时日志上送  连接
- [ ] sse  render   连接
- openapi xt 实现方案
 - | 通知系统   | 站内信（非实时 上线时查询） | 消息提醒（强调及时性 event ） 5分钟 以内 30分钟以上  | 邮件 | 

health check 

| 限流参数       | 可配置                        |   ip + token   endpoint

| Helmet     | 基础安全头          TOMS 现在被扫出来的            |

全局异常处理   切面 



研究异步任务
批量导入
批量导出
设备批量操作
消息通知
报表生成
文件处理

render 是否进行了  pm2 进程守护| traceId         | 每个请求一个链路 ID                        |
oauth 仅登录授权

1. 登录 新账号并同意
2. 登录 已有账号，同意添加新公司
3. 登录 已有账号，不同意新公司， 切换账号授权

webrtc


# 明确的

- 去页面查看业务，然后分析需要的基建

- 统一订单号
- 定时任务
- oss
- 异步任务
- redis 事务锁  多实例的情况
- render 负载策略平均流量
- 接入飞书 slack 发送消息
  - 飞书已接入测试
  - sdk vs api 方案的优劣
  - 关联用户的账号
  - 发送到用户的账号上
