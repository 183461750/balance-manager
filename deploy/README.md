# 部署指南

## 目录结构

```
deploy/
  ├── README.md           # 部署文档
  ├── build_and_push.sh   # 构建和推送镜像脚本
  ├── deploy.sh           # 部署脚本
  ├── deploy.py           # 部署核心逻辑
  ├── docker-compose.yml  # Docker编排文件
  ├── Dockerfile         # Docker构建文件
  └── env.template.yaml  # 环境配置模板
```

## 快速部署

### 1. 环境准备

1. 安装必要工具：
   ```bash
   # macOS
   brew install yq pv
   ```

2. 配置环境：
   ```bash
   # 复制环境配置
   cp env.template.yaml env.yaml
   cp .env.example .env
   
   # 修改配置
   vim env.yaml
   vim .env
   ```

3. 确保目标服务器：
   - 已安装 Docker 和 Docker Compose
   - 已配置 SSH 免密登录
   - 已开放相应端口(默认3000)

### 2. 部署命令

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

### 3. 验证部署

```bash
# 检查服务状态
ssh <目标服务器> 'cd <项目路径> && docker-compose ps'

# 查看服务日志
ssh <目标服务器> 'cd <项目路径> && docker-compose logs -f'
```

## 配置说明

### 1. 环境配置 (env.yaml)

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

### 2. 环境变量 (.env)

```env
# Nacos配置
NACOS_HOST=nacos-server
NACOS_PORT=8848
NACOS_NAMESPACE=public
```

## 问题排查

### 1. 部署失败

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

### 2. 服务异常

1. 检查日志:
   ```bash
   # 查看实时日志
   docker-compose logs -f
   ```

2. 重启服务:
   ```bash
   docker-compose restart
   ```

## 最佳实践

1. 部署准备
   - 确保配置文件正确
   - 检查服务器环境
   - 准备回滚方案

2. 部署过程
   - 分步骤部署验证
   - 保持备份以便回滚
   - 关注部署日志 