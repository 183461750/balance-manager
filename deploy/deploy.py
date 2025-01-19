#!/usr/bin/env python3
import os
import sys
import yaml
import logging
import subprocess
from datetime import datetime
from pathlib import Path
from tqdm import tqdm

# 配置日志
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Deployer:
    def __init__(self, config_file='env.yaml'):
        """初始化部署器"""
        self.config = self._load_config(os.path.join(os.path.dirname(__file__), config_file))
        self.total_steps = 10  # 增加步骤数以更精确显示进度
        self.current_step = 0
        self.progress_bar = tqdm(total=100, desc="部署进度", unit="%")
        
    def _load_config(self, config_file):
        """加载配置文件"""
        try:
            with open(config_file, 'r') as f:
                config = yaml.safe_load(f)
                env_config = config['environments']['dev']
                return {
                    'ssh': {
                        'host': env_config['host'],
                        'project_path': env_config['project_path'],
                        'backup_path': env_config['backup_path']
                    },
                    'image': env_config['image']
                }
        except Exception as e:
            logger.error(f"配置加载失败: {str(e)}")
            sys.exit(1)
            
    def _update_progress(self, message=""):
        """更新进度条"""
        self.current_step += 1
        progress = min((self.current_step / self.total_steps) * 100, 100)
        self.progress_bar.update(progress - self.progress_bar.n)
        if message:
            logger.info(f"[{progress:.1f}%] {message}")
        return progress
        
    def _run_command(self, command, error_msg="命令执行失败"):
        """执行命令并处理输出"""
        try:
            result = subprocess.run(command, shell=True, check=True, capture_output=True, text=True)
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            logger.error(f"{error_msg}: {str(e)}")
            logger.error(f"错误输出: {e.stderr}")
            raise
        except Exception as e:
            logger.error(f"{error_msg}: {str(e)}")
            raise
            
    def _check_project_dir(self):
        """检查项目目录是否存在"""
        try:
            cmd = f"ssh {self.config['ssh']['host']} '[ -d {self.config['ssh']['project_path']} ] && echo exists'"
            result = self._run_command(cmd, "检查项目目录失败")
            return result == 'exists'
        except Exception as e:
            logger.warning(f"检查项目目录失败: {str(e)}")
            return False
            
    def backup(self):
        """备份当前项目"""
        try:
            self._update_progress("检查项目目录")
            if not self._check_project_dir():
                logger.info("项目目录不存在，跳过备份")
                return
                
            backup_time = datetime.now().strftime('%Y%m%d_%H%M%S')
            backup_path = f"{self.config['ssh']['backup_path']}/backup_{backup_time}"
            
            self._update_progress("创建备份")
            cmd = f"ssh {self.config['ssh']['host']} 'mkdir -p {backup_path} && cp -r {self.config['ssh']['project_path']}/* {backup_path}/'"
            self._run_command(cmd, "创建备份失败")
            
            self._update_progress("清理历史备份")
            cmd = f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['backup_path']} && ls -t | tail -n +8 | xargs rm -rf 2>/dev/null || true'"
            self._run_command(cmd, "清理历史备份失败")
            
            logger.info(f"项目备份完成，备份路径: {backup_path}")
        except Exception as e:
            logger.error(f"备份失败: {str(e)}")
            raise
            
    def deploy(self):
        """部署项目"""
        try:
            logger.info("开始部署流程...")
            
            # 备份阶段
            self._update_progress("开始备份流程")
            self.backup()
            
            # 清理和准备阶段
            self._update_progress("清理远程目录")
            self._run_command(
                f"ssh {self.config['ssh']['host']} 'rm -rf {self.config['ssh']['project_path']}/*'",
                "清理远程目录失败"
            )
            
            self._update_progress("创建远程目录")
            self._run_command(
                f"ssh {self.config['ssh']['host']} 'mkdir -p {self.config['ssh']['project_path']}'",
                "创建远程目录失败"
            )
            
            # 代码同步阶段
            self._update_progress("同步代码文件")
            project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            tar_cmd = (
                f"cd {project_root} && "
                f"COPYFILE_DISABLE=1 tar czf - "
                f"--exclude='.DS_Store' --exclude='.git' --exclude='*.pyc' "
                f"--exclude='__pycache__' --exclude='venv' --exclude='balance-manager.tar' . | "
                f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['project_path']} && tar xzf -'"
            )
            self._run_command(tar_cmd, "代码同步失败")
            
            # 配置文件处理
            self._update_progress("复制配置文件")
            self._run_command(
                f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['project_path']} && cp deploy/docker-compose.yml ./'",
                "复制配置文件失败"
            )
            
            # Docker操作阶段
            self._update_progress("拉取Docker镜像")
            image_path = f"{self.config['image']['registry']}/{self.config['image']['namespace']}/{self.config['image']['name']}:{self.config['image']['tag']}"
            self._run_command(
                f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['project_path']} && docker pull {image_path}'",
                "拉取Docker镜像失败"
            )
            
            # 启动服务
            self._update_progress("启动服务")
            self._run_command(
                f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['project_path']} && docker-compose up -d'",
                "启动服务失败"
            )
            
            # 健康检查
            self._update_progress("执行健康检查")
            health_check_cmd = f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['project_path']} && docker-compose ps | grep Up'"
            try:
                self._run_command(health_check_cmd, "健康检查失败")
                logger.info("服务已成功启动")
            except Exception as e:
                logger.error("服务启动异常，查看日志...")
                self._run_command(
                    f"ssh {self.config['ssh']['host']} 'cd {self.config['ssh']['project_path']} && docker-compose logs --tail=50'",
                    "获取服务日志失败"
                )
                raise
            
            self._update_progress("部署完成")
            self.progress_bar.close()
            return True
            
        except Exception as e:
            logger.error(f"部署失败: {str(e)}")
            self.progress_bar.close()
            return False
        finally:
            self.progress_bar.close()

def main():
    try:
        logger.info("开始部署流程...")
        deployer = Deployer()
        if deployer.deploy():
            logger.info("部署流程成功完成!")
        else:
            logger.error("部署流程失败!")
            sys.exit(1)
    except KeyboardInterrupt:
        logger.info("\n部署被用户中断")
        sys.exit(1)
    except Exception as e:
        logger.error(f"部署过程出错: {e}")
        sys.exit(1)

if __name__ == '__main__':
    main() 