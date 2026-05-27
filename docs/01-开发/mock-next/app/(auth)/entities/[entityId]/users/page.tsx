import { notFound } from "next/navigation";

import { assertPermission } from "@/server/auth/permissions";
import { requireSession } from "@/server/auth/require-session";
import { entityService } from "@/service/entities/entity.service";

import { EntityHeader } from "./_components/EntityHeader";
import { UsersPageTable } from "./_components/UsersPageTable";

type UserPageProps = {
  params: {
    entityId: string;
  };
};

export const dynamic = "force-dynamic";

export default async function UserPage({ params }: UserPageProps) {
  // Server Component 先读取 session；没有登录时由公共鉴权能力跳转登录页或抛 401。
  const session = await requireSession();

  // 页面级权限校验：没有 user:list 权限时直接进入 403，不渲染子组件。
  await assertPermission(session, "user:list");

  const entityId = Number(params.entityId);

  if (!Number.isInteger(entityId) || entityId <= 0) {
    notFound();
  }

  // 页面只查询一次机构信息，然后共享给 Header 和用户表格两个 Client Component。
  const entity = await entityService.getEntityForUserPage({
    tenantId: session.tenantId,
    actorUserId: session.userId,
    entityId,
  });

  return (
    <main className="space-y-4 p-6">
      <EntityHeader entity={entity} />
      <UsersPageTable entity={entity} />
    </main>
  );
}
