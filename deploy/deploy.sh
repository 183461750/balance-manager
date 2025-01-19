#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 默认环境
ENV="dev"

# 打印带颜色的消息
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# 检查命令执行状态
check_status() {
    if [ $? -eq 0 ]; then
        print_message "$GREEN" "✓ $1"
    else
        print_message "$RED" "✗ $1"
        exit 1
    fi
}

# 显示帮助信息
show_help() {
    echo "使用方法: $0 [选项]"
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  -b, --build    仅构建镜像"
    echo "  -d, --deploy   仅部署服务"
    echo "  -e, --env      指定环境(dev|test|prod), 默认为dev"
    echo "  无选项         执行完整的构建和部署流程"
    echo
    echo "示例:"
    echo "  $0                    # 在开发环境执行完整部署"
    echo "  $0 -e test           # 在测试环境执行完整部署"
    echo "  $0 -d -e prod        # 仅在生产环境执行部署"
}

# 加载环境配置
load_env() {
    # 检查环境配置文件
    if [ ! -f "deploy/env.yaml" ]; then
        print_message "$RED" "错误: 环境配置文件不存在"
        print_message "$YELLOW" "请复制 deploy/env.template.yaml 到 deploy/env.yaml 并修改配置"
        exit 1
    }

    # 使用yq读取配置
    if ! command -v yq &> /dev/null; then
        print_message "$YELLOW" "正在安装yq..."
        brew install yq
    fi

    # 读取环境配置
    HOST=$(yq eval ".environments.$ENV.host" deploy/env.yaml)
    PORT=$(yq eval ".environments.$ENV.port" deploy/env.yaml)
    PROJECT_PATH=$(yq eval ".environments.$ENV.project_path" deploy/env.yaml)
    BACKUP_PATH=$(yq eval ".environments.$ENV.backup_path" deploy/env.yaml)
    REGISTRY=$(yq eval ".environments.$ENV.image.registry" deploy/env.yaml)
    NAMESPACE=$(yq eval ".environments.$ENV.image.namespace" deploy/env.yaml)
    IMAGE_NAME=$(yq eval ".environments.$ENV.image.name" deploy/env.yaml)
    IMAGE_TAG=$(yq eval ".environments.$ENV.image.tag" deploy/env.yaml)

    # 构建完整镜像名
    FULL_IMAGE_NAME="$REGISTRY/$NAMESPACE/$IMAGE_NAME:$IMAGE_TAG"

    print_message "$GREEN" "已加载 $ENV 环境配置:"
    echo "服务器: $HOST"
    echo "端口: $PORT"
    echo "项目路径: $PROJECT_PATH"
    echo "备份路径: $BACKUP_PATH"
    echo "镜像: $FULL_IMAGE_NAME"
}

# 构建镜像
build_image() {
    print_message "$YELLOW" "=== 开始构建镜像 ==="
    
    # 设置环境变量
    export IMAGE_NAME="$IMAGE_NAME"
    export IMAGE_TAG="$IMAGE_TAG"
    export REGISTRY="$REGISTRY/$NAMESPACE"
    
    # 执行构建脚本
    ./build_and_push.sh
    check_status "镜像构建和推送"
}

# 部署服务
deploy_service() {
    print_message "$YELLOW" "=== 开始部署服务 ==="
    
    # 检查服务健康状态
    print_message "$YELLOW" "检查目标服务器连接..."
    ssh $HOST 'exit' 2>/dev/null
    check_status "服务器连接检查"
    
    # 更新配置文件
    print_message "$YELLOW" "更新部署配置..."
    cat > deploy/config.yaml << EOF
ssh:
  host: $HOST
  project_path: $PROJECT_PATH

backup:
  enabled: true
  path: $BACKUP_PATH
  keep_days: 7

commands:
  - docker-compose down
  - docker-compose up -d
EOF
    check_status "配置更新"
    
    # 执行部署
    python deploy/deploy.py
    check_status "服务部署"
    
    # 验证部署
    print_message "$YELLOW" "验证服务状态..."
    sleep 5  # 等待服务完全启动
    
    # 检查服务状态
    if ssh $HOST "cd $PROJECT_PATH && docker-compose ps | grep 'Up'"; then
        print_message "$GREEN" "✓ 服务已成功启动"
        
        # 显示服务访问信息
        print_message "$GREEN" "=== 部署完成 ==="
        print_message "$GREEN" "服务访问地址: http://$HOST:$PORT"
    else
        print_message "$RED" "✗ 服务启动失败"
        print_message "$YELLOW" "查看服务日志..."
        ssh $HOST "cd $PROJECT_PATH && docker-compose logs --tail=50"
        exit 1
    fi
}

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case "$1" in
        -h|--help)
            show_help
            exit 0
            ;;
        -b|--build)
            BUILD_ONLY=true
            shift
            ;;
        -d|--deploy)
            DEPLOY_ONLY=true
            shift
            ;;
        -e|--env)
            ENV="$2"
            shift 2
            ;;
        *)
            print_message "$RED" "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
done

# 验证环境参数
if [[ ! "$ENV" =~ ^(dev|test|prod)$ ]]; then
    print_message "$RED" "错误: 无效的环境 '$ENV'"
    print_message "$YELLOW" "有效的环境: dev, test, prod"
    exit 1
fi

# 加载环境配置
load_env

# 执行部署流程
if [ "$BUILD_ONLY" = true ]; then
    build_image
elif [ "$DEPLOY_ONLY" = true ]; then
    deploy_service
else
    build_image
    deploy_service
fi 