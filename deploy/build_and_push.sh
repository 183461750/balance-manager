#!/bin/bash

# 从环境变量获取配置，如果没有则使用默认值
IMAGE_NAME=${IMAGE_NAME:-"balance-manager"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
REGISTRY=${REGISTRY:-"registry.cn-hangzhou.aliyuncs.com"}
NAMESPACE=${NAMESPACE:-"iuin"}

# 设置错误处理
set -e
trap 'echo "错误发生在第 $LINENO 行"' ERR

# 检查 Docker Buildx
if ! docker buildx version > /dev/null 2>&1; then
    echo "正在设置 Docker Buildx..."
    docker buildx create --name multiarch-builder --use
fi

# 确保使用多架构构建器
docker buildx use multiarch-builder

# 构建多架构镜像
echo "开始构建多架构镜像..."
docker buildx build \
    --platform linux/arm64,linux/amd64 \
    --tag ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} \
    --push \
    --cache-from type=registry,ref=${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:cache \
    --cache-to type=registry,ref=${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:cache,mode=max \
    .

echo "构建和推送完成！"

# 验证镜像
echo "验证镜像..."
docker pull ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG}
docker inspect ${REGISTRY}/${NAMESPACE}/${IMAGE_NAME}:${IMAGE_TAG} | grep Architecture

echo "镜像构建、推送和验证完成！" 