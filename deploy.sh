#!/bin/bash

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
    echo "  无选项         执行完整的构建和部署流程"
}

# 构建镜像
build_image() {
    print_message "$YELLOW" "=== 开始构建镜像 ==="
    
    # 执行构建脚本
    ./build_and_push.sh
    check_status "镜像构建和推送"
}

# 部署服务
deploy_service() {
    print_message "$YELLOW" "=== 开始部署服务 ==="
    
    # 检查服务健康状态
    print_message "$YELLOW" "检查目标服务器连接..."
    ssh dev-2023.intranet.company 'exit' 2>/dev/null
    check_status "服务器连接检查"
    
    # 执行部署
    python deploy/deploy.py
    check_status "服务部署"
    
    # 验证部署
    print_message "$YELLOW" "验证服务状态..."
    sleep 5  # 等待服务完全启动
    
    # 检查服务状态
    if ssh dev-2023.intranet.company 'cd /www/data/tools/balance-manager/project && docker-compose ps | grep "Up"'; then
        print_message "$GREEN" "✓ 服务已成功启动"
        
        # 显示服务访问信息
        print_message "$GREEN" "=== 部署完成 ==="
        print_message "$GREEN" "服务访问地址: http://dev-2023.intranet.company:3000"
    else
        print_message "$RED" "✗ 服务启动失败"
        print_message "$YELLOW" "查看服务日志..."
        ssh dev-2023.intranet.company 'cd /www/data/tools/balance-manager/project && docker-compose logs --tail=50'
        exit 1
    fi
}

# 解析命令行参数
case "$1" in
    -h|--help)
        show_help
        exit 0
        ;;
    -b|--build)
        build_image
        ;;
    -d|--deploy)
        deploy_service
        ;;
    *)
        # 执行完整流程
        build_image
        deploy_service
        ;;
esac 