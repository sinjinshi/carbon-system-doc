import { withApi } from "@/server/api/with-api";
import { listUsersQuerySchema } from "@/service/users/schema/user.schema";
import { userService } from "@/service/users/user.service";

type ApiSession = {
  tenantId: number;
  userId: number;
};

type ApiHandlerContext = {
  session: ApiSession;
};

export async function GET(req: Request) {
  // GET /api/users?entityId=1&page=1&pageSize=20
  // Route Handler 只做 HTTP 层适配：从 Request.url 读取 query。
  const searchParams = new URL(req.url).searchParams;

  const query = listUsersQuerySchema.parse({
    entityId: searchParams.get("entityId"),
    page: searchParams.get("page"),
    pageSize: searchParams.get("pageSize"),
    keyword: searchParams.get("keyword") ?? undefined,
    status: searchParams.get("status") ?? undefined,
  });

  // 如果是 POST/PATCH，可以在这里读取 body：
  // const body = await req.json();
  // const payload = someBodySchema.parse(body);

  return withApi(
    {
      // 公共 API 包装层负责读取登录态，未登录时直接返回 401。
      auth: true,

      // 权限在进入业务逻辑前统一校验。
      permission: "user:list",

      // 记录访问日志、耗时、错误等横切信息。
      log: true,
    },
    async ({ session }: ApiHandlerContext) => {
      return userService.listUsers({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        entityId: query.entityId,
        page: query.page,
        pageSize: query.pageSize,
        keyword: query.keyword,
        status: query.status,
      });
    },
  )(req);
}
