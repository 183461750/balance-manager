from flask import Flask, render_template, request, jsonify, session
import psycopg2
from psycopg2.extras import DictCursor
import hashlib
import os
from dotenv import load_dotenv
import logging

app = Flask(__name__)
app.secret_key = os.urandom(24)  # 用于session加密

# 配置日志
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载环境变量
load_dotenv()

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

def get_db_config():
    """获取当前环境的数据库配置"""
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

@app.route('/')
def index():
    current_env = session.get('current_env', 'dev')
    return render_template('index.html', 
                         environments=ENVIRONMENTS,
                         current_env=current_env)

@app.route('/set_environment', methods=['POST'])
def set_environment():
    env = request.form.get('environment')
    if env in ENVIRONMENTS:
        session['current_env'] = env
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

if __name__ == '__main__':
    app.run(debug=True) 