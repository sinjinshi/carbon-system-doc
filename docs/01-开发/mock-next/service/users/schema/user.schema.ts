import { z } from "zod";

// GET /api/users 的 query schema：负责把 URL query string 转成业务可用类型。
export const listUsersQuerySchema = z.object({
  entityId: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  keyword: z.string().trim().max(50).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "LOCKED"]).optional(),
});

export type ListUsersQueryInput = z.infer<typeof listUsersQuerySchema>;

// service 的入参 schema：这里包含 session 派生出来的 tenantId/actorUserId。
export const listUsersServiceInputSchema = z.object({
  tenantId: z.number().int().positive(),
  actorUserId: z.number().int().positive(),
  entityId: z.number().int().positive(),
  page: z.number().int().positive(),
  pageSize: z.number().int().min(1).max(100),
  keyword: z.string().trim().max(50).optional(),
  status: z.enum(["ACTIVE", "DISABLED", "LOCKED"]).optional(),
});

export type ListUsersServiceInput = z.infer<
  typeof listUsersServiceInputSchema
>;
