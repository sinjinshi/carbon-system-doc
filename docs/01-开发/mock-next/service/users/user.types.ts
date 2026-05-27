export type UserStatus = "ACTIVE" | "DISABLED" | "LOCKED";

// 模拟数据库用户记录。真实项目里通常来自 ORM model 或 repository DTO。
export type UserRecord = {
  id: number;
  tenantId: number;
  entityId: number;
  displayName: string;
  email: string;
  mobile?: string | null;
  status: UserStatus;
  roleNames: string[];
  isSuperAdmin: boolean;
  passwordHash: string;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// 模拟数据库组织记录，用于 listUsers 前置业务检查。
export type EntityRecord = {
  id: number;
  tenantId: number;
  name: string;
  code: string;
  status: "ACTIVE" | "DISABLED";
};

// 返回给浏览器的用户结构，只保留前端展示需要的安全字段。
export type ClientUser = {
  id: number;
  displayName: string;
  email: string;
  mobile?: string | null;
  status: UserStatus;
  roleNames: string[];
  lastLoginAt?: string | null;
  createdAt: string;
};

// repository 返回分页查询结果，service 再转换成 API response。
export type UsersPageResult = {
  total: number;
  items: UserRecord[];
};
