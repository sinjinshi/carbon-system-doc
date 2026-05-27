import type {
  EntityRecord,
  UserRecord,
  UsersPageResult,
  UserStatus,
} from "./user.types";

// repository 只描述数据访问能力；具体 DB/ORM 实现不放在展示 mock 中。
export declare const userRepository: {
  findEntityById(input: {
    tenantId: number;
    entityId: number;
  }): Promise<EntityRecord | null>;

  findUserSimple(input: {
    tenantId: number;
    userId: number;
  }): Promise<Pick<UserRecord, "id" | "isSuperAdmin"> | null>;

  findUsersPage(input: {
    tenantId: number;
    entityId: number;
    page: number;
    pageSize: number;
    keyword?: string;
    status?: UserStatus;
  }): Promise<UsersPageResult>;
};
