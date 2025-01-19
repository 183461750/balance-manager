# Balance Manager

负载均衡管理器，用于管理和监控服务器负载均衡状态。

## 功能特性

- 实时监控服务器状态
- 自动负载均衡管理
- 支持多种负载均衡策略
- 可视化监控界面

## 快速开始

### 环境要求

- Python 3.9+
- Docker
- Docker Compose
- yq (用于解析YAML配置)

### 本地开发

1. 克隆仓库：
   ```bash
   git clone https://github.com/183461750/balance-manager.git
   cd balance-manager
   ```

2. 安装依赖：
   ```bash
   pip install -r requirements.txt
   ```

3. 启动服务：
   ```bash
   python app.py
   ```

### 部署

项目提供了一键部署脚本 `deploy.sh`，支持多环境部署：

1. 配置环境：
   ```bash
   # 复制环境配置模板
   cp deploy/env.template.yaml deploy/env.yaml
   
   # 修改配置文件
   vim deploy/env.yaml
   ```

2. 部署命令：
   ```bash
   # 完整部署流程（默认开发环境）
   ./deploy.sh

   # 指定环境部署
   ./deploy.sh -e test  # 测试环境
   ./deploy.sh -e prod  # 生产环境

   # 仅构建镜像
   ./deploy.sh -b -e test

   # 仅部署服务
   ./deploy.sh -d -e prod
   ```

3. 查看帮助：
   ```bash
   ./deploy.sh --help
   ```

部署脚本特性：
- 支持多环境配置（开发、测试、生产）
- 自动构建多架构镜像（支持 arm64/amd64）
- 使用阿里云镜像仓库加速部署
- 自动备份已部署的服务
- 部署状态实时反馈
- 部署后自动验证服务状态

## 配置说明

### 环境配置 (deploy/env.yaml)

```yaml
environments:
  dev:  # 开发环境
    host: dev-2023.intranet.company
    port: 3000
    project_path: /www/data/tools/balance-manager/project
    backup_path: /www/data/tools/balance-manager/backup
    image:
      registry: registry.cn-hangzhou.aliyuncs.com
      namespace: iuin
      name: balance-manager
      tag: latest

  test:  # 测试环境配置
    ...

  prod:  # 生产环境配置
    ...
```

### 部署配置

部署脚本会根据环境配置自动生成 `deploy/config.yaml`：

```yaml
ssh:
  host: {环境对应的主机}
  project_path: {环境对应的项目路径}

backup:
  enabled: true
  path: {环境对应的备份路径}
  keep_days: 7

commands:
  - docker-compose down
  - docker-compose up -d
```

## 开发规范

1. 代码风格：
   - 遵循 PEP 8 规范
   - 使用类型注解
   - 编写完整的文档字符串

2. 提交规范：
   - feat: 新功能
   - fix: 修复问题
   - docs: 文档更新
   - style: 代码格式
   - refactor: 代码重构
   - test: 测试相关
   - chore: 其他更改

## 技术栈

- 后端：Python + Flask
- 前端：HTML + CSS + JavaScript
- 容器化：Docker + Docker Compose
- 部署：Shell + Python 自动化脚本

## 贡献指南

1. Fork 本仓库
2. 创建特性分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

## 许可证

[MIT](LICENSE) 