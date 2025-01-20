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

## 快速开始

### 1. 本地开发

1. 构建本地镜像：
   ```bash
   # 在项目根目录下执行
   docker build -t balance-manager:local -f deploy/Dockerfile .
   ```

2. 启动服务：
   ```bash
   # 在项目根目录下执行
   docker-compose -f deploy/docker-compose.yml up -d
   ```

3. 配置Nacos：
   - 访问 http://localhost:3000
   - 点击右上角设置按钮
   - 输入Nacos服务器地址和命名空间信息

4. 查看日志：
   ```bash
   docker-compose -f deploy/docker-compose.yml logs -f
   ```

### 2. 环境部署

1. 环境准备：
   - 安装必要工具：
     ```bash
     # macOS
     brew install yq pv
     ```
   - 确保目标服务器：
     * 已安装 Docker 和 Docker Compose
     * 已配置 SSH 免密登录
     * 已开放相应端口(默认3000)

2. 配置环境：
   ```bash
   # 复制并修改环境配置
   cp env.template.yaml env.yaml
   vim env.yaml
   ```

3. 部署命令：
   ```bash
   # 开发环境（默认）
   ./deploy.sh
   
   # 测试环境
   ./deploy.sh -e test
   
   # 生产环境
   ./deploy.sh -e prod
   
   # 仅构建镜像
   ./deploy.sh -b
   
   # 仅部署服务
   ./deploy.sh -d
   ```

## 环境配置

### 环境配置文件 (env.yaml)

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
      tag: dev
```

## 问题排查

### 1. 本地开发问题

1. 服务无法启动：
   ```bash
   # 检查容器状态
   docker-compose -f deploy/docker-compose.yml ps
   
   # 查看详细日志
   docker-compose -f deploy/docker-compose.yml logs
   ```

2. 重新构建和启动：
   ```bash
   # 完全重建
   docker-compose -f deploy/docker-compose.yml down
   docker build -t balance-manager:local -f deploy/Dockerfile .
   docker-compose -f deploy/docker-compose.yml up -d
   ```

### 2. 环境部署问题

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

3. 服务异常：
   ```bash
   # 在目标服务器上查看日志
   ssh <目标服务器> 'cd <项目路径> && docker-compose logs -f'
   ```

## 最佳实践

1. 开发流程
   - 本地开发和测试
   - 提交代码前确保本地运行正常
   - 使用正确的环境配置

2. 部署流程
   - 总是先在测试环境验证
   - 保持备份以便回滚
   - 关注部署日志
   - 部署后及时验证功能 