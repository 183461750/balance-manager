from flask import Flask, render_template, request, jsonify, session
import psycopg2
from psycopg2.extras import DictCursor
import hashlib
import os
from dotenv import load_dotenv
import logging
import nacos
import yaml

app = Flask(__name__)
app.secret_key = os.urandom(24)  # 用于session加密

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载环境变量
load_dotenv()

# Nacos客户端
nacos_client = None

# 环境配置
ENVIRONMENTS = {
    'dev': {
        'name': '开发环境',
        'config': {
            'host': os.getenv('DEV_DB_HOST', 'localhost'),
            'user': os.getenv('DEV_DB_USER', 'postgres'),
            'password': os.getenv('DEV_DB_PASSWORD', ''),
            'dbname': os.getenv('DEV_DB_NAME', 'postgres'),
            'port': int(os.getenv('DEV_DB_PORT', '5432'))
        }
    },
    'test': {
        'name': '测试环境',
        'config': {
            'host': os.getenv('TEST_DB_HOST', 'localhost'),
            'user': os.getenv('TEST_DB_USER', 'postgres'),
            'password': os.getenv('TEST_DB_PASSWORD', ''),
            'dbname': os.getenv('TEST_DB_NAME', 'postgres'),
            'port': int(os.getenv('TEST_DB_PORT', '5432'))
        }
    },
    'prod': {
        'name': '生产环境',
        'config': {
            'host': os.getenv('PROD_DB_HOST', 'localhost'),
            'user': os.getenv('PROD_DB_USER', 'postgres'),
            'password': os.getenv('PROD_DB_PASSWORD', ''),
            'dbname': os.getenv('PROD_DB_NAME', 'postgres'),
            'port': int(os.getenv('PROD_DB_PORT', '5432'))
        }
    }
}

def init_nacos_client(server_addresses, namespace='', username='', password=''):
    """初始化Nacos客户端"""
    global nacos_client
    try:
        nacos_client = nacos.NacosClient(
            server_addresses=server_addresses,
            namespace=namespace,
            username=username or None,
            password=password or None
        )
        logger.info("Nacos客户端初始化成功")
        return True
    except Exception as e:
        logger.error(f"Nacos客户端初始化失败: {str(e)}")
        return False

def get_nacos_config():
    """从Nacos获取配置"""
    if not nacos_client:
        logger.error("Nacos客户端未初始化")
        return None
    
    try:
        # 从配置文件获取默认值
        config_file = config.get('nacos', {}).get('config_file', 'common.yml')
        config_group = config.get('nacos', {}).get('config_group', 'v1.0.0')
        
        # 获取配置内容
        logger.info(f"尝试获取Nacos配置: {config_file}")
        content = nacos_client.get_config(config_file, config_group)
        logger.info(f"获取到的配置内容: {content}")
        
        if not content:
            logger.error("未找到配置内容")
            return None
        
        # 解析YAML内容
        nacos_config = yaml.safe_load(content)
        logger.info(f"解析后的配置: {nacos_config}")
        
        # 提取PostgreSQL配置和网关地址
        result = {}
        if 'pgsql' in nacos_config:
            pg_config = nacos_config['pgsql']
            result['db_config'] = {
                'host': pg_config.get('address', 'localhost'),
                'port': int(pg_config.get('port', 5432)),
                'user': pg_config.get('username', 'postgres'),
                'password': pg_config.get('password', ''),
                'dbname': pg_config.get('dbname', 'postgres')
            }
        
        if 'gateway' in nacos_config and 'url' in nacos_config['gateway']:
            result['gateway_url'] = nacos_config['gateway']['url']
            
        return result
    except Exception as e:
        logger.error(f"获取Nacos配置失败: {str(e)}")
        logger.exception(e)  # 打印详细的错误堆栈
        return None

def get_db_config():
    """获取当前环境的数据库配置"""
    config_type = session.get('config_type', 'nacos')  # 默认使用nacos配置
    
    if config_type == 'nacos':
        nacos_config = get_nacos_config()
        if nacos_config and 'db_config' in nacos_config:
            return nacos_config['db_config']
        logger.warning("无法获取Nacos配置，将使用本地配置")
    
    # 使用本地配置
    env = session.get('current_env', 'dev')
    config = ENVIRONMENTS[env]['config']
    # 记录当前使用的配置（不包含密码）
    safe_config = config.copy()
    safe_config['password'] = '******'
    logger.info(f"当前使用的数据库配置: {safe_config}")
    return config

def get_db_connection():
    """获取数据库连接"""
    config = get_db_config()
    try:
        logger.info(f"尝试连接数据库: {config['host']}:{config['port']}/{config['dbname']}")
        return psycopg2.connect(
            cursor_factory=DictCursor,
            connect_timeout=3,  # 设置连接超时时间
            **config
        )
    except psycopg2.OperationalError as e:
        logger.error(f"数据库连接失败: {str(e)}")
        error_message = str(e)
        if "No such file or directory" in error_message:
            raise Exception(
                "无法连接到数据库服务器。请检查：\n"
                "1. PostgreSQL服务是否已启动\n"
                "2. 数据库主机和端口配置是否正确\n"
                "3. 防火墙是否允许连接\n"
                f"当前配置: 主机={config['host']}, 端口={config['port']}"
            )
        elif "password authentication failed" in error_message:
            raise Exception("数据库认证失败，请检查用户名和密码配置")
        elif "database" in error_message and "does not exist" in error_message:
            raise Exception(f"数据库 {config['dbname']} 不存在")
        else:
            raise Exception(f"连接数据库时出错: {error_message}")

def calculate_md5(value):
    """计算余额的MD5值"""
    return hashlib.md5(str(value).encode()).hexdigest()

def calculate_password_md5(plain_password):
    """计算密码的MD5值"""
    MD5_SALT = "lingxi"
    return hashlib.md5((MD5_SALT + plain_password).encode()).hexdigest()

def load_config():
    """加载配置文件"""
    config_path = os.path.join('config', 'config.yaml')
    template_path = os.path.join('config', 'config.template.yaml')
    
    # 如果配置文件不存在,复制模板
    if not os.path.exists(config_path) and os.path.exists(template_path):
        with open(template_path, 'r', encoding='utf-8') as f:
            config = yaml.safe_load(f)
            os.makedirs(os.path.dirname(config_path), exist_ok=True)
            with open(config_path, 'w', encoding='utf-8') as f:
                yaml.dump(config, f, allow_unicode=True)
    
    # 加载配置
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except Exception as e:
        logger.error(f"加载配置文件失败: {str(e)}")
        # 返回默认配置
        return {
            'title': '瓴犀辅助工具'
        }

# 加载配置
config = load_config()

@app.route('/')
def index():
    """首页"""
    return render_template('index.html',
                         title=config['title'],
                         nacos=config.get('nacos', {
                             'default_server': 'localhost',
                             'default_namespace': 'server'
                         }))

@app.route('/set_environment', methods=['POST'])
def set_environment():
    env = request.form.get('environment')
    if env in ENVIRONMENTS:
        session['current_env'] = env
        session['config_type'] = 'env'
        return jsonify({
            'success': True,
            'message': f'已切换到{ENVIRONMENTS[env]["name"]}',
            'environment': env
        })
    return jsonify({
        'success': False,
        'message': '无效的环境选择'
    })

@app.route('/get_balance', methods=['POST'])
def get_balance():
    try:
        phone = request.form['phone']
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 查询余额
                sql = """
                SELECT account_balance, account_balance_encrypt
                FROM pay_member_asset_account
                WHERE member_id = (SELECT id FROM mem_member WHERE phone = %s)
                """
                cursor.execute(sql, (phone,))
                result = cursor.fetchone()
                
                if not result:
                    return jsonify({'success': False, 'message': '未找到用户余额信息'})
                
                current_env = session.get('current_env', 'dev')
                env_name = ENVIRONMENTS[current_env]['name']
                
                return jsonify({
                    'success': True,
                    'data': {
                        'balance': float(result[0]),
                        'encrypt': result[1],
                        'environment': env_name
                    }
                })
        finally:
            conn.close()
            
    except Exception as e:
        logger.error(f"查询余额失败: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/update_balance', methods=['POST'])
def update_balance():
    try:
        phone = request.form['phone']
        new_balance = float(request.form['balance'])
        balance_encrypt = calculate_md5(new_balance)

        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 先查询用户ID
                sql_get_member = "SELECT id FROM mem_member WHERE phone = %s"
                cursor.execute(sql_get_member, (phone,))
                member = cursor.fetchone()
                
                if not member:
                    return jsonify({'success': False, 'message': '用户不存在'})
                
                # 更新余额
                sql_update = """
                UPDATE pay_member_asset_account 
                SET account_balance = %s, account_balance_encrypt = %s 
                WHERE member_id = %s
                """
                cursor.execute(sql_update, (new_balance, balance_encrypt, member[0]))
                conn.commit()
                
                current_env = session.get('current_env', 'dev')
                env_name = ENVIRONMENTS[current_env]['name']
                
                return jsonify({
                    'success': True, 
                    'message': f'余额更新成功 ({env_name})',
                    'data': {
                        'balance': new_balance,
                        'encrypt': balance_encrypt,
                        'environment': env_name
                    }
                })
        finally:
            conn.close()
            
    except Exception as e:
        logger.error(f"更新余额失败: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/set_nacos_config', methods=['POST'])
def set_nacos_config():
    try:
        server_addresses = request.form.get('server_addresses', '')
        namespace = request.form.get('namespace', '')
        username = request.form.get('username', '')
        password = request.form.get('password', '')
        
        if not server_addresses:
            return jsonify({
                'success': False,
                'message': 'Nacos服务器地址不能为空'
            })
            
        # 初始化Nacos客户端
        if init_nacos_client(server_addresses, namespace, username, password):
            # 测试获取配置
            config = get_nacos_config()
            if config:
                session['config_type'] = 'nacos'
                return jsonify({
                    'success': True,
                    'message': 'Nacos配置成功，已切换到Nacos配置模式',
                    'config': {k: v if k != 'password' else '******' for k, v in config.items()}
                })
            else:
                return jsonify({
                    'success': False,
                    'message': '无法从Nacos获取PostgreSQL配置，请检查common.yml是否存在且包含正确的配置'
                })
        else:
            return jsonify({
                'success': False,
                'message': 'Nacos客户端初始化失败'
            })
            
    except Exception as e:
        logger.error(f"设置Nacos配置失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'设置Nacos配置时出错: {str(e)}'
        })

@app.route('/disable_nacos', methods=['POST'])
def disable_nacos():
    session['use_nacos'] = False
    return jsonify({
        'success': True,
        'message': '已切换回本地配置模式'
    })

@app.route('/get_gateway_url')
def get_gateway_url():
    """获取网关地址"""
    try:
        nacos_config = get_nacos_config()
        if nacos_config and 'gateway_url' in nacos_config:
            return jsonify({
                'success': True,
                'gateway_url': nacos_config['gateway_url']
            })
        return jsonify({
            'success': False,
            'message': '未找到网关配置'
        })
    except Exception as e:
        logger.error(f"获取网关地址失败: {str(e)}")
        return jsonify({
            'success': False,
            'message': str(e)
        })

@app.route('/health')
def health_check():
    """健康检查端点"""
    try:
        # 检查数据库连接
        config = get_db_config()
        conn = get_db_connection()
        conn.close()
        
        # 检查Nacos连接（如果启用）
        if session.get('config_type') == 'nacos' and nacos_client:
            config_file = config.get('nacos', {}).get('config_file', 'common.yml')
            config_group = config.get('nacos', {}).get('config_group', 'v1.0.0')
            nacos_client.get_config(config_file, config_group)
        
        return jsonify({
            'status': 'ok',
            'message': '服务运行正常',
            'config_type': session.get('config_type', 'env'),
            'environment': session.get('current_env', 'dev')
        })
    except Exception as e:
        logger.error(f"健康检查失败: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': str(e),
            'config_type': session.get('config_type', 'env'),
            'environment': session.get('current_env', 'dev')
        }), 500

@app.route('/verify_password', methods=['POST'])
def verify_password():
    try:
        phone = request.form['phone']
        password = request.form['password']
        
        # 计算输入密码的MD5值
        password_md5 = calculate_password_md5(password)
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 查询用户密码
                sql = "SELECT password FROM mem_user WHERE phone = %s"
                cursor.execute(sql, (phone,))
                result = cursor.fetchone()
                
                if not result:
                    return jsonify({'success': False, 'message': '未找到用户信息'})
                
                # 比较密码
                stored_password = result[0]
                if password_md5 == stored_password:
                    return jsonify({
                        'success': True,
                        'message': '密码验证通过'
                    })
                else:
                    return jsonify({
                        'success': False,
                        'message': '密码不正确'
                    })
        finally:
            conn.close()
            
    except Exception as e:
        logger.error(f"验证密码失败: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

@app.route('/update_password', methods=['POST'])
def update_password():
    try:
        phone = request.form['phone']
        new_password = request.form['new_password']
        
        # 计算新密码的MD5值
        new_password_md5 = calculate_password_md5(new_password)
        
        conn = get_db_connection()
        try:
            with conn.cursor() as cursor:
                # 更新密码
                sql_update = "UPDATE mem_user SET password = %s WHERE phone = %s"
                cursor.execute(sql_update, (new_password_md5, phone))
                affected_rows = cursor.rowcount
                
                if affected_rows == 0:
                    return jsonify({'success': False, 'message': '用户不存在'})
                    
                conn.commit()
                return jsonify({
                    'success': True,
                    'message': '密码修改成功'
                })
        finally:
            conn.close()
            
    except Exception as e:
        logger.error(f"修改密码失败: {str(e)}")
        return jsonify({'success': False, 'message': str(e)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3000, debug=True) 