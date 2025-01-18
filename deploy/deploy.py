#!/usr/bin/env python3
import os
import sys
import yaml
import paramiko
import datetime
import logging
from pathlib import Path

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Deployer:
    def __init__(self, config_path='config.yaml'):
        self.config = self._load_config(config_path)
        self.ssh = None

    def _load_config(self, config_path):
        """加载配置文件"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"加载配置文件失败: {e}")
            sys.exit(1)

    def connect(self):
        """建立SSH连接"""
        try:
            self.ssh = paramiko.SSHClient()
            self.ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
            self.ssh.connect(
                hostname=self.config['ssh']['host'],
                look_for_keys=True
            )
            logger.info(f"成功连接到服务器: {self.config['ssh']['host']}")
        except Exception as e:
            logger.error(f"连接服务器失败: {e}")
            sys.exit(1)

    def backup(self):
        """备份远程项目"""
        if not self.config['backup']['enabled']:
            return

        try:
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f"backup_{timestamp}"
            backup_path = os.path.join(self.config['backup']['path'], backup_name)
            
            cmd = f"cp -r {self.config['ssh']['project_path']} {backup_path}"
            self._execute_command(cmd)
            
            # 清理旧备份
            cleanup_cmd = f"find {self.config['backup']['path']} -type d -name 'backup_*' -mtime +{self.config['backup']['keep_days']} -exec rm -rf {{}} \\;"
            self._execute_command(cleanup_cmd)
            
            logger.info(f"项目备份完成: {backup_path}")
        except Exception as e:
            logger.error(f"备份失败: {e}")
            sys.exit(1)

    def deploy(self):
        """执行部署"""
        try:
            # 同步代码
            rsync_cmd = f"rsync -avz --delete ./ {self.config['ssh']['host']}:{self.config['ssh']['project_path']}"
            os.system(rsync_cmd)
            logger.info("代码同步完成")

            # 执行配置的命令
            for cmd in self.config['commands']:
                self._execute_command(f"cd {self.config['ssh']['project_path']} && {cmd}")
            
            logger.info("部署完成")
        except Exception as e:
            logger.error(f"部署失败: {e}")
            sys.exit(1)

    def _execute_command(self, command):
        """执行远程命令"""
        try:
            stdin, stdout, stderr = self.ssh.exec_command(command)
            exit_status = stdout.channel.recv_exit_status()
            
            if exit_status != 0:
                error = stderr.read().decode().strip()
                raise Exception(f"命令执行失败: {error}")
            
            return stdout.read().decode().strip()
        except Exception as e:
            logger.error(f"执行命令失败: {command}")
            logger.error(f"错误信息: {e}")
            raise

    def close(self):
        """关闭SSH连接"""
        if self.ssh:
            self.ssh.close()

def main():
    # 检查配置文件
    config_path = Path(__file__).parent / 'config.yaml'
    if not config_path.exists():
        logger.error("配置文件不存在，请根据template创建config.yaml")
        sys.exit(1)

    try:
        deployer = Deployer(str(config_path))
        deployer.connect()
        deployer.backup()
        deployer.deploy()
    except KeyboardInterrupt:
        logger.info("部署被用户中断")
    except Exception as e:
        logger.error(f"部署过程出错: {e}")
    finally:
        deployer.close()

if __name__ == '__main__':
    main() 