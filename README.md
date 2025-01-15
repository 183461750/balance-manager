# 用户余额管理工具

一个简单的Web工具，用于管理用户账户余额。支持多环境配置，可以查询和修改用户余额。

## 功能特点

- 多环境支持（开发、测试、生产）
- 通过手机号查询用户余额
- 修改用户余额
- 自动计算余额的MD5加密值
- 实时环境切换
- 友好的错误提示

## 技术栈

- Python 3.x
- Flask
- PostgreSQL
- HTML/CSS/JavaScript

## 安装

1. 克隆仓库：
```bash
git clone https://github.com/your-username/balance-manager.git
cd balance-manager
```

2. 安装依赖：
```bash
pip install -r requirements.txt
```

3. 配置环境变量：
```bash
cp .env.example .env
```
然后编辑 `.env` 文件，填入正确的数据库配置。

## 配置说明

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

## 运行

```bash
python app.py
```

访问 http://localhost:5000 即可使用。

## 使用说明

1. 选择环境（开发/测试/生产）
2. 输入用户手机号
3. 点击"查询余额"可以查看当前余额
4. 输入新的余额金额，点击"修改余额"进行更新

## 注意事项

- 请谨慎修改生产环境的数据
- 确保数据库配置正确
- 注意数据库权限设置

## 开发说明

- 使用 Flask 框架开发
- 使用 PostgreSQL 数据库
- 前端使用原生 JavaScript，无需其他依赖
- 支持实时环境切换
- 包含详细的错误处理和日志记录

## 贡献

欢迎提交 Issue 和 Pull Request。

## 许可证

MIT License 