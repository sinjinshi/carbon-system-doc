export type EntityStatus = "ACTIVE" | "DISABLED";

// 返回给 Client Component 的安全结构，不暴露数据库内部字段。
export type ClientEntity = {
  id: number;
  tenantId: number;
  tenantName: string;
  name: string;
  code: string;
  status: EntityStatus;
  ownerName?: string | null;
  userCount: number;
  updatedAt: string;
};

