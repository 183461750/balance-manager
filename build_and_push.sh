#!/bin/bash

# 从环境变量获取配置，如果没有则使用默认值
IMAGE_NAME=${IMAGE_NAME:-"balance-manager"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}
REGISTRY=${REGISTRY:-"registry.cn-hangzhou.aliyuncs.com/iuin"}

# 构建多架构镜像
echo "开始构建多架构镜像..."
docker buildx build --platform linux/arm64,linux/amd64 -t ${IMAGE_NAME}:${IMAGE_TAG} . --load

# 标记镜像
echo "标记镜像..."
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}

# 推送到阿里云仓库
echo "推送镜像到阿里云仓库..."
docker push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}

echo "构建和推送完成！" 