# Balance Manager

余额管理工具，用于管理和修改服务账户余额。

## 功能特性

- Nacos配置中心集成
- 余额查询与修改
- 操作日志记录
- 支持多环境部署
- 自动备份和回滚

## 快速开始

### 环境要求

- Python 3.9+
- Docker
- Docker Compose
- yq (用于解析YAML配置)
- pv (用于显示传输进度)

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

### 部署流程

#### 1. 环境准备

1. 配置环境：
   ```bash
   # 复制环境配置模板
   cp deploy/env.template.yaml deploy/env.yaml
   
   # 修改配置文件
   vim deploy/env.yaml
   ```

2. 安装必要工具：
   ```bash
   # macOS
   brew install yq pv
   ```

3. 确保目标服务器:
   - 已安装 Docker 和 Docker Compose
   - 已配置 SSH 免密登录
   - 已开放相应端口(默认3000)

#### 2. 部署命令

```bash
# 完整部署流程（默认开发环境）
./deploy.sh

# 指定环境部署
./deploy.sh -e test  # 测试环境
./deploy.sh -e prod  # 生产环境

# 仅构建镜像
./deploy.sh -b

# 仅部署服务
./deploy.sh -d
```

### 问题排查指南

#### 1. 部署失败

1. SSH连接问题:
   ```bash
   # 测试SSH连接
   ssh <目标服务器>
   ```

2. 权限问题:
   ```bash
   # 检查目录权限
   ls -la <项目路径>
   ```

3. 端口占用:
   ```bash
   # 检查端口占用
   netstat -tunlp | grep 3000
   ```

#### 2. 服务异常

1. 检查日志:
   ```bash
   # 查看实时日志
   docker-compose logs -f
   ```

2. 重启服务:
   ```bash
   docker-compose restart
   ```

### 最佳实践

#### 1. 部署准备
- 确保配置文件正确
- 检查服务器环境
- 准备回滚方案

#### 2. 部署过程
- 分步骤部署验证
- 保持备份以便回滚
- 关注部署日志

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
   - 编写必要的注释

2. 提交规范：
   - feat: 新功能
   - fix: 修复问题
   - docs: 文档更新
   - style: 代码格式
   - refactor: 代码重构

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