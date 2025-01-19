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

### 部署说明

详细的部署文档请参考 [部署指南](deploy/README.md)。

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