import type { ClientUser, UserRecord } from "./user.types";

// mapper 负责把数据库实体转换成前端安全结构，避免泄露 passwordHash 等敏感字段。
export function toClientUser(user: UserRecord): ClientUser {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    mobile: user.mobile,
    status: user.status,
    roleNames: user.roleNames,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    createdAt: user.createdAt.toISOString(),
  };
}
