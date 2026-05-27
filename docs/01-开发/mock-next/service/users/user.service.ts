import { Errors } from "@/server/errors/app-error";

import {
  listUsersServiceInputSchema,
  type ListUsersServiceInput,
} from "./schema/user.schema";
import { toClientUser } from "./user.mapper";
import { userRepository } from "./user.repository";

function formatValidationMessage(
  issues: Array<{ path: Array<string | number>; message: string }>,
) {
  return issues
    .map((issue) => {
      const field = issue.path.join(".") || "input";

      return `${field}: ${issue.message}`;
    })
    .join("; ");
}

export const userService = {
  async listUsers(input: unknown) {
    // service 是业务边界，即使 API Route 已校验，这里仍做一次入参兜底校验。
    const parsedInput = listUsersServiceInputSchema.safeParse(input);

    if (!parsedInput.success) {
      // 把 zod 的字段级错误转换成可返回给前端的业务错误原因。
      throw Errors.business(
        `参数校验失败：${formatValidationMessage(parsedInput.error.issues)}`,
      );
    }

    const payload: ListUsersServiceInput = parsedInput.data;

    /**
     * 1. 业务检查：当前租户下组织是否存在
     */
    const entity = await userRepository.findEntityById({
      tenantId: payload.tenantId,
      entityId: payload.entityId,
    });

    if (!entity) {
      throw Errors.notFound("组织不存在");
    }

    /**
     * 2. 业务检查：组织状态是否允许查看用户
     */
    if (entity.status === "DISABLED") {
      throw Errors.business("该组织已停用，不能查看用户列表");
    }

    /**
     * 3. 业务检查：大分页限制
     *
     * 这个只是示例。
     * 普通用户最多 pageSize 50，管理员可以 100。
     */
    if (payload.pageSize > 50) {
      const actor = await userRepository.findUserSimple({
        tenantId: payload.tenantId,
        userId: payload.actorUserId,
      });

      if (!actor) {
        throw Errors.unauthenticated();
      }

      if (!actor.isSuperAdmin) {
        throw Errors.business("普通用户不能使用大分页查询");
      }
    }

    /**
     * 4. 查询用户列表，只向 repository 传递已经校验过的业务参数
     *
     * findMany 查不到会返回 []，不是错误。
     */
    const result = await userRepository.findUsersPage({
      tenantId: payload.tenantId,
      entityId: payload.entityId,
      page: payload.page,
      pageSize: payload.pageSize,
      keyword: payload.keyword,
      status: payload.status,
    });

    /**
     * 5. 转换成前端安全结构
     *
     * 不要直接把数据库字段全部返回给前端。
     */
    return {
      total: result.total,
      page: payload.page,
      pageSize: payload.pageSize,
      items: result.items.map(toClientUser),
    };
  },
};
