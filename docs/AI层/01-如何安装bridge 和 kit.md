# 如何安装 ai 插件
codespace 每次启动的时候，需要执行下方命令才可以 获取 `ai plugins` 的权限


```shell

## 重置权限

unset GITHUB_TOKEN
gh auth login
gh auth setup-git

```


## 安装 next-kit


安装插件

```shell

claude plugin marketplace add <git-url>
claude plugin install next-kit --scope project

```

更新插件

```shell

claude plugin marketplace update next-kit-dev
claude plugin update next-kit@next-kit-dev --scope project

```


## 安装 design-bridge


> 前置要求

| 工具        | 谁会用到                              | 安装方式                           |
| ----------- | ------------------------------------- | ---------------------------------- |
| go ≥ 1.25   | 首次调用时编译 Go 抽取器（一次性）    | go.dev/dl，装完 go version 自检    |
| Claude Code | 插件与所有技能的宿主                  | claude.com/claude-code             |
| curl / tar  | 用 Claude Design URL 拉 gzip tar 包时 | macOS / Linux 自带；Windows 走 WSL |
| gh（可选）  | 只有 /report-issue 用到               | cli.github.com                     |

```shell

# 1) 把仓库注册成 marketplace（<git-url> 即 design-bridge 的 git 地址）
claude plugin marketplace add <git-url>

# 2) 以 project 作用域安装到当前项目
claude plugin install design-bridge --scope project

```

更新插件

```shell

# 1) 刷新 marketplace 元数据
claude plugin marketplace update design-bridge-dev

# 2) 在 project 作用域上升级插件
claude plugin update design-bridge@design-bridge-dev --scope project

```