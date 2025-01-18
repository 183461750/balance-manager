# 部署工具

自动化部署脚本，支持代码同步、服务重启和自动备份。

## 功能特性

- 基于SSH配置文件的服务器连接
- 自动备份现有项目
- 自动清理过期备份
- 代码同步
- 自动重启服务
- 详细的日志记录

## 使用方法

1. 安装依赖：
```bash
pip install -r requirements.txt
```

2. 配置：
- 复制 `config.template.yaml` 为 `config.yaml`
- 修改配置文件中的相关设置

3. 运行：
```bash
python deploy.py
```

## 配置说明

配置文件（config.yaml）包含以下主要部分：

- ssh: SSH连接相关配置
- commands: 部署后需要执行的命令
- backup: 备份相关设置

详细配置项请参考 config.template.yaml 中的注释。

## 注意事项

- 确保已配置好SSH密钥认证
- 确保服务器上已安装docker和docker-compose
- 建议首次运行时开启备份功能
- 配置文件包含敏感信息，注意不要提交到代码仓库 