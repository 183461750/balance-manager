# Balance Manager

余额管理工具，用于管理和修改服务账户余额。

## 功能特性

- Nacos配置中心集成
- 余额查询与修改
- 操作日志记录
- 支持多环境部署
- 自动备份和回滚

## TODO

- nacos地址选择下拉框
  - 添加网关域名显示(nacosIP(namespace)显示在上面, 域名显示在下面)
    - 可能得加个懒加载功能, 先展示十个, 并且通过接口获取到对应的域名, 滚动到下拉框底部, 继续加载
    - 添加输入框搜索下拉框数据的功能
- nacos中获取的'common.yml'配置, 下载下来, 方便后续读取(命名规则: common-{ip}-{namespace}-{group}.yml)

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