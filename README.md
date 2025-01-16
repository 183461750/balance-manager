# 用户余额管理工具

一个简单的Web工具，用于管理用户账户余额。支持多环境配置，可以查询和修改用户余额。支持从Nacos配置中心读取数据库配置。

## 功能特点

- 多环境支持（开发、测试、生产）
- 通过手机号查询用户余额
- 修改用户余额
- 自动计算余额的MD5加密值
- 实时环境切换
- 友好的错误提示
- 支持从Nacos配置中心读取配置

## 技术栈

- Python 3.x
- Flask
- PostgreSQL
- Nacos配置中心
- HTML/CSS/JavaScript

## 安装

1. 克隆仓库：
```bash
git clone git@github.com:183461750/balance-manager.git
cd balance-manager
```

2. 创建并激活虚拟环境：
```bash
# 创建虚拟环境
python3 -m venv venv

# 在 Linux/macOS 上激活虚拟环境
source venv/bin/activate

# 在 Windows 上激活虚拟环境
venv\Scripts\activate
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

4. 配置环境变量：
```bash
cp .env.example .env
```
然后编辑 `.env` 文件，填入正确的数据库配置。

## 配置说明

### 本地配置
在 `.env` 文件中配置各环境的数据库连接信息：

```ini
# 开发环境配置
DEV_DB_HOST=localhost
DEV_DB_USER=postgres
DEV_DB_PASSWORD=your_password
DEV_DB_NAME=your_database
DEV_DB_PORT=5432

# 测试环境配置
TEST_DB_HOST=test-host
...

# 生产环境配置
PROD_DB_HOST=prod-host
...
```

### Nacos配置
支持从Nacos配置中心读取PostgreSQL配置。在Nacos中，配置应该存储在以下位置：
- 数据ID：common.yml
- 组：server
- 格式：YAML

配置示例：
```yaml
pgsql:
  address: localhost
  port: 5432
  username: dbadmin
  password: dbadmin
  dbname: v3-test
```

## 运行

确保虚拟环境已激活，然后运行：
```bash
python app.py
```

访问 http://localhost:5000 即可使用。

## 使用说明

1. 配置来源选择
   - 可以选择使用本地配置或Nacos配置
   - 使用Nacos配置时，需要填写Nacos服务器地址等信息

2. 环境选择（使用本地配置时）
   - 选择环境（开发/测试/生产）

3. 余额操作
   - 输入用户手机号
   - 点击"查询余额"可以查看当前余额
   - 输入新的余额金额，点击"修改余额"进行更新

## 注意事项

- 请谨慎修改生产环境的数据
- 确保数据库配置正确
- 注意数据库权限设置
- 不要将 `.env` 文件提交到版本控制系统
- 确保在虚拟环境中运行应用
- 使用Nacos配置时，确保Nacos服务可用且配置正确

## 开发说明

- 使用 Flask 框架开发
- 使用 PostgreSQL 数据库
- 支持Nacos配置中心
- 前端使用原生 JavaScript，无需其他依赖
- 支持实时环境切换
- 包含详细的错误处理和日志记录

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT License 