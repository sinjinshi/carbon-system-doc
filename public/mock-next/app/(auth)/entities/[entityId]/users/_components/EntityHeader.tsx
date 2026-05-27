"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/cloud/ui/badge";
import { Button } from "@/cloud/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/cloud/ui/card";
import { Separator } from "@/cloud/ui/separator";
import type { ClientEntity } from "@/service/entities/entity.types";

type EntityHeaderProps = {
  entity: ClientEntity;
};

const ENTITY_STATUS_LABEL: Record<ClientEntity["status"], string> = {
  ACTIVE: "启用中",
  DISABLED: "已停用",
};

async function fetchEntity(entityId: number) {
  // Client Component 不能直接调用 server service，只能通过 API Route 刷新机构信息。
  const response = await fetch(`/api/entities/${entityId}`, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("机构信息刷新失败");
  }

  return response.json() as Promise<ClientEntity>;
}

export function EntityHeader({ entity }: EntityHeaderProps) {
  const [currentEntity, setCurrentEntity] = useState(entity);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    setCurrentEntity(entity);
  }, [entity]);

  function handleRefresh() {
    setErrorMessage(null);
    setIsRefreshing(true);

    // 用户点击刷新时重新请求 GET /api/entities/:entityId。
    void fetchEntity(entity.id)
      .then(setCurrentEntity)
      .catch((error: unknown) => {
        setErrorMessage(
          error instanceof Error ? error.message : "机构信息刷新失败",
        );
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <CardTitle>{currentEntity.name}</CardTitle>
            <Badge
              variant={
                currentEntity.status === "ACTIVE" ? "default" : "secondary"
              }
            >
              {ENTITY_STATUS_LABEL[currentEntity.status]}
            </Badge>
          </div>
          <div className="text-sm text-muted-foreground">
            {currentEntity.tenantName} / {currentEntity.code}
          </div>
        </div>

        <Button
          disabled={isRefreshing}
          onClick={handleRefresh}
          size="sm"
          type="button"
          variant="outline"
        >
          <RefreshCw className="mr-2 size-4" />
          刷新
        </Button>
      </CardHeader>

      <CardContent>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          <span>用户数：{currentEntity.userCount}</span>
          <Separator className="h-4" orientation="vertical" />
          <span>负责人：{currentEntity.ownerName ?? "-"}</span>
          <Separator className="h-4" orientation="vertical" />
          <span>更新时间：{currentEntity.updatedAt}</span>
        </div>

        {errorMessage ? (
          <p className="mt-3 text-sm text-destructive">{errorMessage}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
