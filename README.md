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

项目提供了一键部署脚本 `deploy.sh`，支持以下功能：

1. 完整部署流程：
   ```bash
   ./deploy.sh
   ```

2. 仅构建镜像：
   ```bash
   ./deploy.sh --build
   ```

3. 仅部署服务：
   ```bash
   ./deploy.sh --deploy
   ```

4. 查看帮助：
   ```bash
   ./deploy.sh --help
   ```

部署脚本特性：
- 自动构建多架构镜像（支持 arm64/amd64）
- 使用阿里云镜像仓库加速部署
- 自动备份已部署的服务
- 部署状态实时反馈
- 部署后自动验证服务状态

## 配置说明

1. 创建配置文件：
   ```bash
   cp deploy/config.template.yaml deploy/config.yaml
   ```

2. 修改配置：
   ```yaml
   ssh:
     host: dev-2023.intranet.company  # 部署服务器
     project_path: /www/data/tools/balance-manager/project  # 项目路径
   
   backup:
     enabled: true  # 是否启用备份
     path: /www/data/tools/balance-manager/backup  # 备份路径
     keep_days: 7  # 保留天数
   
   commands:  # 部署后执行的命令
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