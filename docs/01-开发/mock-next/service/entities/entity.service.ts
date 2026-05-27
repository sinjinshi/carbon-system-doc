import type { ClientEntity } from "./entity.types";

// 这里只声明业务能力，具体实现假设由真实项目的 service/repository 提供。
export declare const entityService: {
  getEntityForUserPage(input: {
    tenantId: number;
    actorUserId: number;
    entityId: number;
  }): Promise<ClientEntity>;
};

