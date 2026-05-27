import { withApi } from "@/server/api/with-api";
import { entityService } from "@/service/entities/entity.service";
import { getEntityParamsSchema } from "@/service/entities/schema/entity.schema";

type ApiSession = {
  tenantId: number;
  userId: number;
};

type EntityRouteContext = {
  params: {
    entityId: string;
  };
};

type ApiHandlerContext = {
  session: ApiSession;
};

export async function GET(req: Request, { params }: EntityRouteContext) {
  // GET /api/entities/:entityId
  // 动态路由参数来自 Next.js Route Handler context。
  const routeParams = getEntityParamsSchema.parse(params);

  // 当前 GET 接口不读取 body；POST/PATCH 场景可使用：
  // const body = await req.json();

  return withApi(
    {
      // 公共 API 包装层负责鉴权：未登录请求不会进入业务逻辑。
      auth: true,

      // 鉴权通过后再做权限判断，当前接口复用查看用户列表权限。
      permission: "user:list",

      // 统一记录接口访问日志。
      log: true,
    },
    async ({ session }: ApiHandlerContext) => {
      return entityService.getEntityForUserPage({
        tenantId: session.tenantId,
        actorUserId: session.userId,
        entityId: routeParams.entityId,
      });
    },
  )(req);
}
