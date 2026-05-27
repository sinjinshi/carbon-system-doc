"use client";

import { ChevronLeft, ChevronRight, RefreshCw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { Badge } from "@/cloud/ui/badge";
import { Button } from "@/cloud/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/cloud/ui/card";
import { Input } from "@/cloud/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/cloud/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/cloud/ui/table";
import type { ClientEntity } from "@/service/entities/entity.types";
import type { ClientUser, UserStatus } from "@/service/users/user.types";

type UsersPageTableProps = {
  entity: ClientEntity;
};

type UserStatusFilter = UserStatus | "ALL";

type UsersPageResponse = {
  total: number;
  page: number;
  pageSize: number;
  items: ClientUser[];
};

type SearchState = {
  keyword: string;
  status: UserStatusFilter;
};

const USER_STATUS_LABEL: Record<UserStatus, string> = {
  ACTIVE: "启用",
  DISABLED: "停用",
  LOCKED: "锁定",
};

const initialSearchState: SearchState = {
  keyword: "",
  status: "ALL",
};

function buildUsersQuery(input: {
  entityId: number;
  page: number;
  pageSize: number;
  filters: SearchState;
}) {
  // 表格组件只拼接 HTTP query，真正的参数校验在 API Route 和 service 层完成。
  const query = new URLSearchParams({
    entityId: String(input.entityId),
    page: String(input.page),
    pageSize: String(input.pageSize),
  });

  if (input.filters.keyword) {
    query.set("keyword", input.filters.keyword);
  }

  if (input.filters.status !== "ALL") {
    query.set("status", input.filters.status);
  }

  return query;
}

export function UsersPageTable({ entity }: UsersPageTableProps) {
  const [draftFilters, setDraftFilters] = useState(initialSearchState);
  const [filters, setFilters] = useState(initialSearchState);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [data, setData] = useState<UsersPageResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((data?.total ?? 0) / pageSize));
  }, [data?.total, pageSize]);

  useEffect(() => {
    const controller = new AbortController();
    const query = buildUsersQuery({
      entityId: entity.id,
      page,
      pageSize,
      filters,
    });

    setIsLoading(true);
    setErrorMessage(null);

    // Client Component 通过 API Route 获取分页数据，不直接 import server service。
    void fetch(`/api/users?${query.toString()}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("用户列表加载失败");
        }

        return response.json() as Promise<UsersPageResponse>;
      })
      .then(setData)
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }

        setErrorMessage(
          error instanceof Error ? error.message : "用户列表加载失败",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [entity.id, filters, page, pageSize]);

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setFilters({
      keyword: draftFilters.keyword.trim(),
      status: draftFilters.status,
    });
  }

  function handlePageSizeChange(value: string) {
    setPage(1);
    setPageSize(Number(value));
  }

  function handleRefresh() {
    setFilters((current) => ({ ...current }));
  }

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle>{entity.name} 用户列表</CardTitle>

          <Button
            disabled={isLoading}
            onClick={handleRefresh}
            size="sm"
            type="button"
            variant="outline"
          >
            <RefreshCw className="mr-2 size-4" />
            刷新
          </Button>
        </div>

        <form
          className="grid gap-3 md:grid-cols-[minmax(180px,1fr)_180px_120px_120px]"
          onSubmit={handleSearch}
        >
          <Input
            maxLength={50}
            onChange={(event) =>
              setDraftFilters((current) => ({
                ...current,
                keyword: event.target.value,
              }))
            }
            placeholder="搜索姓名、邮箱或手机号"
            value={draftFilters.keyword}
          />

          <Select
            onValueChange={(value) =>
              setDraftFilters((current) => ({
                ...current,
                status: value as UserStatusFilter,
              }))
            }
            value={draftFilters.status}
          >
            <SelectTrigger>
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">全部状态</SelectItem>
              <SelectItem value="ACTIVE">启用</SelectItem>
              <SelectItem value="DISABLED">停用</SelectItem>
              <SelectItem value="LOCKED">锁定</SelectItem>
            </SelectContent>
          </Select>

          <Select onValueChange={handlePageSizeChange} value={String(pageSize)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 条/页</SelectItem>
              <SelectItem value="50">50 条/页</SelectItem>
              <SelectItem value="100">100 条/页</SelectItem>
            </SelectContent>
          </Select>

          <Button disabled={isLoading} type="submit">
            <Search className="mr-2 size-4" />
            查询
          </Button>
        </form>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>用户</TableHead>
                <TableHead>联系方式</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>最近登录</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-sm text-muted-foreground">
                      #{user.id}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>{user.email}</div>
                    <div className="text-sm text-muted-foreground">
                      {user.mobile ?? "-"}
                    </div>
                  </TableCell>
                  <TableCell>{user.roleNames.join("、") || "-"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={user.status === "ACTIVE" ? "default" : "outline"}
                    >
                      {USER_STATUS_LABEL[user.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>{user.lastLoginAt ?? "-"}</TableCell>
                </TableRow>
              ))}

              {!isLoading && data?.items.length === 0 ? (
                <TableRow>
                  <TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    暂无用户
                  </TableCell>
                </TableRow>
              ) : null}

              {isLoading ? (
                <TableRow>
                  <TableCell
                    className="h-24 text-center text-muted-foreground"
                    colSpan={5}
                  >
                    加载中...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>

        {errorMessage ? (
          <p className="text-sm text-destructive">{errorMessage}</p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">
            共 {data?.total ?? 0} 条，第 {page} / {totalPages} 页
          </span>

          <div className="flex items-center gap-2">
            <Button
              disabled={isLoading || page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              size="sm"
              type="button"
              variant="outline"
            >
              <ChevronLeft className="mr-2 size-4" />
              上一页
            </Button>
            <Button
              disabled={isLoading || page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
              size="sm"
              type="button"
              variant="outline"
            >
              下一页
              <ChevronRight className="ml-2 size-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
