from flask import Flask, render_template, request, jsonify, session, redirect, url_for
import json
import psycopg2
from psycopg2.extras import DictCursor
import hashlib
import os
from dotenv import load_dotenv
import logging
import nacos
import yaml

app = Flask(__name__)
app.secret_key = 'dev'  # 用于会话管理的密钥，生产环境应使用更安全的随机密钥
app.secret_key = os.urandom(24)  # 用于session加密

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载环境变量
load_dotenv()

# Nacos配置缓存 - {server_address}_{namespace}: config
nacos_config_cache = {}
# 当前活跃的Nacos客户端
active_nacos_clients = {}

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

def init_nacos_client(server_addresses, namespace, username=None, password=None):
    logger.info(f"get_nacos_config - server_addresses: {server_addresses}, namespace: {namespace}")
    client_key = f"{server_addresses}_{namespace}"
    logger.info(f"生成的client_key: {client_key}")
    try:
        # 如果客户端已存在，直接使用
        if client_key in active_nacos_clients:
            logger.info(f"使用缓存的Nacos客户端: {client_key}")
            return True

        # 创建新客户端
        logger.info(f"创建Nacos客户端 - 参数: server_addresses={server_addresses}, namespace={namespace}, username={username}, password={'******' if password else None}")
        client = nacos.NacosClient(
            server_addresses=server_addresses,
            namespace=namespace,
            username=username or None,
            password=password or None
        )
        active_nacos_clients[client_key] = client
        logger.info(f"Nacos客户端初始化成功: {client_key}")
        return True
    except Exception as e:
        logger.error(f"Nacos客户端初始化失败: {str(e)}", exc_info=True)
        logger.exception("Nacos客户端初始化异常堆栈:")
        return False

def get_nacos_config(server_addresses, namespace, group='v1.0.0'):
    """从Nacos获取配置"""
    client_key = f"{server_addresses}_{namespace}"
    if client_key not in active_nacos_clients:
        logger.error(f"Nacos客户端未初始化: {client_key}")
        return None
    
    # 检查缓存
    if client_key in nacos_config_cache:
        logger.info(f"使用缓存的Nacos配置: {client_key}")
        return nacos_config_cache[client_key]
    
    try:
        client = active_nacos_clients[client_key]
        # 从配置文件获取默认值
        config_file = 'common.yml'
        config_group = group
        logger.info(f"尝试从Nacos获取配置 - 服务器: {server_addresses}, 命名空间: {namespace}, 配置文件: {config_file}, 配置组: {config_group}")
        
        # 获取配置内容
        logger.info(f"尝试获取Nacos配置: {config_file} (group: {config_group})")
        content = client.get_config(config_file, config_group)
        logger.info(f"获取到的配置内容: {content}")
        if not content:
            logger.error("从Nacos获取的配置内容为空")
        
        if not content:
            logger.error("未找到配置内容")
            return None
        
        # 解析YAML内容
        nacos_config = yaml.safe_load(content)
        logger.info(f"解析后的配置: {nacos_config}")
        # 检查网关配置
        if 'gateway' not in nacos_config:
            logger.error("配置中未找到gateway节点")
        elif 'url' not in nacos_config['gateway']:
            logger.error("gateway节点中未找到url字段")
        
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
            
        # 缓存配置
        nacos_config_cache[client_key] = result
        return result
    except Exception as e:
        logger.error(f"获取Nacos配置失败: {str(e)}")
        logger.exception(e)  # 打印详细的错误堆栈
        return None

# 移除重复的路由定义



@app.route('/get_gateway_url')
def get_gateway_url():
    try:
        server_address = request.args.get('server_address')
        namespace = request.args.get('namespace')
        username = request.args.get('username', 'nacos')  # 允许URL参数覆盖默认用户名
        password = request.args.get('password', 'nacos')  # 允许URL参数覆盖默认密码
    
        if not server_address or not namespace:
            return jsonify({'success': False, 'message': '缺少必要参数: server_address和namespace'}), 400
    
        # 处理服务器地址格式
        if ':' not in server_address:
            server_address_with_port = f'{server_address}:8848'
        else:
            server_address_with_port = server_address
        client_key = f'{server_address_with_port}_{namespace}'
        logger.info(f'get_gateway_url调用 - 参数: server={server_address_with_port}, namespace={namespace}, client_key={client_key}')
    
        # 检查并初始化Nacos客户端
        if client_key not in active_nacos_clients:
            logger.info(f'客户端{client_key}不存在，尝试初始化...')
            init_success = init_nacos_client(
                server_addresses=server_address_with_port,
                namespace=namespace,
                username=username,
                password=password
            )
            if not init_success:
                return jsonify({
                    'success': False,
                    'message': f'Nacos客户端初始化失败: {client_key}',
                    'details': '请检查Nacos服务器地址、命名空间及凭据是否正确'
                }), 500
    
        # 获取配置
        nacos_config = get_nacos_config(server_address_with_port, namespace)
        if not nacos_config:
            return jsonify({
                'success': False,
                'message': '未找到Nacos配置',
                'details': f'配置路径: common.yml, 命名空间: {namespace}'
            }), 404
    
        # 验证网关URL
        if 'gateway_url' not in nacos_config:
            return jsonify({
                'success': False,
                'message': '配置中缺少网关URL',
                'details': f'当前配置: {json.dumps(nacos_config, ensure_ascii=False)}'
            }), 404

        return jsonify({
            'success': True,
            'gateway_url': nacos_config['gateway_url'],
            'message': '网关配置获取成功',
            'server_info': f'{server_address_with_port} (namespace: {namespace})'
        })
    except Exception as e:
        logger.error(f"获取网关URL失败: {str(e)}", exc_info=True)
        return jsonify({
            'success': False,
            'message': f'服务器内部错误: {str(e)}'
        }), 500


def get_db_config():
    """获取当前环境的数据库配置"""
    config_type = session.get('config_type', 'nacos')  # 默认使用nacos配置
    
    if config_type == 'nacos':
        server_address = session.get('nacos_server_address')
        namespace = session.get('nacos_namespace')
        if not server_address or not namespace:
            logger.error("Nacos配置参数缺失")
            return None
        nacos_config = get_nacos_config(server_address, namespace)
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

def get_db_connection_with_config(config):
    """根据提供的配置获取数据库连接"""
    try:
        db_config = config.get('db_config')
        if not db_config:
            raise Exception("配置中缺少数据库配置")
        
        logger.info(f"尝试连接数据库: {db_config['host']}:{db_config['port']}/{db_config['dbname']}")
        return psycopg2.connect(
            cursor_factory=DictCursor,
            connect_timeout=3,
            **db_config
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
                f"当前配置: 主机={db_config['host']}, 端口={db_config['port']}"
            )
        elif "password authentication failed" in error_message:
            raise Exception("数据库认证失败，请检查用户名和密码配置")
        elif "database" in error_message and "does not exist" in error_message:
            raise Exception(f"数据库 {db_config['dbname']} 不存在")
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

@app.route('/get_nacos_configs')
def get_nacos_configs():
    """获取所有保存的Nacos配置"""
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config', 'nacos_configs.json')
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            configs = json.load(f)
            return jsonify(configs)
    except FileNotFoundError:
        return jsonify([]), 200
    except json.JSONDecodeError:
        logger.error('nacos_configs.json文件格式错误')
        logger.info(f"set_nacos_config接口响应 - success: {success}, message: {message}")
        return jsonify({'error': '配置文件格式错误'}), 500
    except Exception as e:
        logger.error(f'读取配置文件失败: {str(e)}')
        return jsonify({'error': '读取配置失败'}), 500

@app.route('/save_nacos_config', methods=['POST'])
def save_nacos_config():
    """保存Nacos配置"""
    config_data = request.json
    required_fields = ['server_addresses']
    for field in required_fields:
        if field not in config_data:
            return jsonify({'error': f'缺少必要字段: {field}'}), 400

    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config', 'nacos_configs.json')
    try:
        # 读取现有配置
        if os.path.exists(config_path):
            with open(config_path, 'r', encoding='utf-8') as f:
                configs = json.load(f)
        else:
            configs = []

        # 检查是否已存在相同server的配置
        existing_index = next((i for i, c in enumerate(configs) if c['server_addresses'] == config_data['server_addresses']), None)
        if existing_index is not None:
            # 更新现有配置
            configs[existing_index] = config_data
        else:
            # 添加新配置
            configs.append(config_data)

        # 写入文件
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(configs, f, ensure_ascii=False, indent=2)

        return jsonify({'success': True, 'message': '配置保存成功'})
    except Exception as e:
        logger.error(f'保存配置失败: {str(e)}')
        return jsonify({'error': '保存配置失败'}), 500

@app.route('/')
def index():
    return render_template('index.html', 
                           config=config,
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

@app.route('/get_balance')
def get_balance():
    try:
        phone = request.args.get('phone')
        server_address = request.args.get('server_address')
        namespace = request.args.get('namespace', '')
        username = request.args.get('username', 'nacos')
        password = request.args.get('password', 'nacos')
        
        if not phone:
            return jsonify({'success': False, 'message': '手机号不能为空'})
        
        # 如果有Nacos参数，则使用Nacos配置
        if server_address:
            # 规范化server_address
            server_address = server_address.strip()
            if ':' not in server_address:
                server_address += ':8848'
            
            # 构建客户端key
            client_key = f'{server_address}_{namespace}'
            
            # 检查是否需要初始化Nacos客户端
            if client_key not in active_nacos_clients:
                init_success = init_nacos_client(
                    server_addresses=server_address,
                    namespace=namespace,
                    username=username,
                    password=password
                )
                if not init_success:
                    return jsonify({
                        'success': False,
                        'message': f'Nacos客户端初始化失败: {client_key}',
                        'details': '请检查Nacos服务器地址、命名空间及凭据是否正确'
                    }), 500
            
            # 获取Nacos配置
            config = get_nacos_config(server_address, namespace)
            if config and 'db_config' in config:
                # 使用Nacos配置查询数据库
                conn = get_db_connection_with_config(config)
            else:
                return jsonify({
                    'success': False,
                    'message': '无法从Nacos获取数据库配置',
                    'details': '请检查common.yml是否包含正确的PostgreSQL配置'
                })
        else:
            # 使用当前配置
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
                
                # 确定环境名称
                if server_address:
                    env_name = f"Nacos({server_address})"
                else:
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
    logger.info("接收到set_nacos_config接口请求")
    server_addresses = request.form.get('server_addresses')
    namespace = request.form.get('namespace')
    username = request.form.get('username')
    logger.info(f"set_nacos_config接口参数 - server_addresses: {server_addresses}, namespace: {namespace}, username: {username}")
    try:
        server_addresses = request.form.get('server_addresses', '').strip()
        # 添加默认端口8848（如果未指定）
        if not server_addresses:
            server_addresses = 'localhost:8848'
        elif ':' not in server_addresses:
            server_addresses += ':8848'
        logger.info(f"规范化后的server_addresses: {server_addresses}")
        namespace = request.form.get('namespace', '').strip() or ''
        username = request.form.get('username', '').strip() or 'nacos'
        password = request.form.get('password', '').strip() or 'nacos'
        
        if not server_addresses:
            return jsonify({
                'success': False,
                'message': 'Nacos服务器地址不能为空'
            })
            
        # 初始化Nacos客户端
        logger.info(f"准备初始化Nacos客户端 - server_addresses: {server_addresses}, namespace: {namespace}, username: {username}")
        if init_nacos_client(server_addresses, namespace, username, password):
            logger.info(f"Nacos客户端初始化成功，准备存储连接信息到session")
            # 存储Nacos连接信息到session
            session['nacos_server_address'] = server_addresses
            session['nacos_namespace'] = namespace
            
            # 测试获取配置
            logger.info(f"开始获取Nacos配置 - server_addresses: {server_addresses}, namespace: {namespace}")
            config = get_nacos_config(server_addresses, namespace)
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

import argparse

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8001, help='Port to run the server on')
    args = parser.parse_args()
    app.run(host='0.0.0.0', port=args.port, debug=True)