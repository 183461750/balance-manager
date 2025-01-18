#!/usr/bin/env python3
import os
import sys
import yaml
import subprocess
import datetime
import logging
from pathlib import Path
from tqdm import tqdm

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Deployer:
    def __init__(self, config_path='config.yaml'):
        self.config = self._load_config(config_path)
        self.total_steps = 10  # 总步骤数
        self.current_step = 0

    def _load_config(self, config_path):
        """加载配置文件"""
        try:
            with open(config_path, 'r') as f:
                return yaml.safe_load(f)
        except Exception as e:
            logger.error(f"加载配置文件失败: {e}")
            sys.exit(1)

    def _update_progress(self, message):
        """更新进度"""
        self.current_step += 1
        progress = min((self.current_step / self.total_steps) * 100, 100)  # 确保不超过100%
        logger.info(f"[{progress:.1f}%] {message}")

    def _run_command(self, command, desc=None):
        """执行命令并显示进度"""
        try:
            if desc:
                logger.info(desc)
            
            process = subprocess.Popen(
                command,
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                universal_newlines=True,
                bufsize=1
            )

            # 实时显示输出
            has_progress = False
            for line in process.stdout:
                if desc and "%" in line:  # 如果是进度信息
                    print(f"\r{desc}: {line.strip()}", end='', flush=True)
                    has_progress = True
                else:
                    print(line.strip())

            # 等待命令完成
            process.wait()
            
            if process.returncode != 0:
                error = process.stderr.read()
                raise subprocess.CalledProcessError(process.returncode, command, error)

            if has_progress:  # 如果显示了进度，最后换行
                print()

        except subprocess.CalledProcessError as e:
            logger.error(f"命令执行失败: {command}")
            logger.error(f"错误输出: {e.stderr}")
            raise

    def backup(self):
        """备份远程项目"""
        if not self.config['backup']['enabled']:
            return

        try:
            self._update_progress("开始检查项目目录")
            # 检查项目目录是否存在
            check_cmd = f"ssh {self.config['ssh']['host']} '[ -d {self.config['ssh']['project_path']} ] && echo exists'"
            try:
                result = self._run_command(check_cmd)
                if 'exists' not in result:
                    logger.info("项目目录不存在,跳过备份")
                    return
            except:
                logger.info("项目目录不存在,跳过备份")
                return
            
            self._update_progress("开始创建备份")
            timestamp = datetime.datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_name = f"backup_{timestamp}"
            backup_path = os.path.join(self.config['backup']['path'], backup_name)
            
            # 创建备份
            cmd = f"ssh {self.config['ssh']['host']} 'cp -r {self.config['ssh']['project_path']} {backup_path}'"
            self._run_command(cmd)
            
            self._update_progress("清理历史备份")
            # 清理旧备份
            cleanup_cmd = f"ssh {self.config['ssh']['host']} 'find {self.config['backup']['path']} -type d -name \"backup_*\" -mtime +{self.config['backup']['keep_days']} -exec rm -rf {{}} \\;'"
            self._run_command(cleanup_cmd)
            
            logger.info(f"项目备份完成: {backup_path}")
        except Exception as e:
            logger.error(f"备份失败: {e}")
            sys.exit(1)

    def deploy(self):
        """执行部署"""
        try:
            project_root = str(Path(__file__).parent.parent)
            
            self._update_progress("清理远程目录")
            # 先删除远程目录
            clean_cmd = f"ssh {self.config['ssh']['host']} 'rm -rf {self.config['ssh']['project_path']}'"
            self._run_command(clean_cmd)

            self._update_progress("创建远程目录")
            # 创建远程目录
            mkdir_cmd = f"ssh {self.config['ssh']['host']} 'mkdir -p {self.config['ssh']['project_path']}'"
            self._run_command(mkdir_cmd)

            self._update_progress("同步代码文件")
            # 使用tar同步代码，通过pv显示进度
            tar_cmd = (
                f"cd {project_root} && "
                f"tar czf - "
                f"--exclude='.DS_Store' --exclude='.git' --exclude='*.pyc' "
                f"--exclude='__pycache__' --exclude='venv' --exclude='balance-manager.tar' . | "
                f"pv -s $(tar czf - "
                f"--exclude='.DS_Store' --exclude='.git' --exclude='*.pyc' "
                f"--exclude='__pycache__' --exclude='venv' --exclude='balance-manager.tar' . | wc -c) | "
                f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['project_path']} && tar xzf -'"
            )
            self._run_command(tar_cmd, "代码同步进度")
            logger.info("代码同步完成")

            self._update_progress("准备传输Docker镜像")
            # 传输Docker镜像
            image_path = f"{project_root}/balance-manager.tar"
            image_size = os.path.getsize(image_path)
            scp_cmd = f"pv -s {image_size} {image_path} | ssh {self.config['ssh']['host']} 'cat > {self.config['ssh']['project_path']}/balance-manager.tar'"
            self._run_command(scp_cmd, "Docker镜像传输进度")
            logger.info("Docker镜像传输完成")

            self._update_progress("加载Docker镜像")
            # 加载Docker镜像
            load_cmd = f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['project_path']} && docker load < balance-manager.tar'"
            self._run_command(load_cmd)
            logger.info("Docker镜像加载完成")

            self._update_progress("执行部署命令")
            # 执行配置的命令
            for cmd in self.config['commands']:
                remote_cmd = f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['project_path']} && {cmd}'"
                self._run_command(remote_cmd)
            
            self._update_progress("完成部署")
            logger.info("部署完成")
        except Exception as e:
            logger.error(f"部署失败: {e}")
            sys.exit(1)

def main():
    # 检查配置文件
    config_path = Path(__file__).parent / 'config.yaml'
    if not config_path.exists():
        logger.error("配置文件不存在，请根据template创建config.yaml")
        sys.exit(1)

    try:
        logger.info("开始部署流程...")
        deployer = Deployer(str(config_path))
        deployer.backup()
        deployer.deploy()
        logger.info("部署流程完成!")
    except KeyboardInterrupt:
        logger.info("部署被用户中断")
    except Exception as e:
        logger.error(f"部署过程出错: {e}")

if __name__ == '__main__':
    main() 