import { z } from "zod";

// API Route 从动态路由 context.params 取到的是 string，这里统一转换成业务层需要的 number。
export const getEntityParamsSchema = z.object({
  entityId: z.coerce.number().int().positive(),
});

export type GetEntityParamsInput = z.infer<typeof getEntityParamsSchema>;

