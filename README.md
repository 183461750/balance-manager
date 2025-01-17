# Balance Manager

余额管理工具，支持通过Nacos配置或环境变量方式连接数据库，提供余额查询和修改功能。

## 功能特性

- 支持Nacos配置中心
- 支持环境变量配置
- 余额查询和修改
- 配置状态可视化
- Docker容器化部署

## 部署方式

### Docker Compose部署（推荐）

1. 确保已安装Docker和Docker Compose
2. 克隆项目到本地
3. 在项目根目录执行：

```bash
# 构建并启动服务
docker compose up -d

# 查看服务日志
docker compose logs -f

# 停止服务
docker compose down
```

### 本地开发部署

1. 安装Python 3.9+
2. 安装依赖：
```bash
pip install -r requirements.txt
```
3. 启动应用：
```bash
python app.py
```

## 配置说明

### Nacos配置方式
- 支持配置Nacos服务器地址
- 可选配置命名空间
- 支持用户认证

### 环境变量配置
- 支持开发、测试、生产环境切换
- 使用环境变量设置数据库连接信息

## 访问地址

- Web界面：http://localhost:3000

## 注意事项

1. 生产环境部署时请修改docker-compose.yml中的环境变量
2. 建议使用Nacos配置方式以便统一管理
3. 容器化部署时数据持久化已通过volumes配置 