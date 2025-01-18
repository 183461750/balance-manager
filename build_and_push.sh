#!/bin/bash

# 镜像名称和标签
IMAGE_NAME="balance-manager"
IMAGE_TAG="latest"
ALI_REGISTRY="registry.cn-hangzhou.aliyuncs.com/iuin"

# 构建多架构镜像
echo "开始构建多架构镜像..."
docker buildx build --platform linux/arm64,linux/amd64 -t ${IMAGE_NAME}:${IMAGE_TAG} . --load

# 标记镜像
echo "标记镜像..."
docker tag ${IMAGE_NAME}:${IMAGE_TAG} ${ALI_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}

# 推送到阿里云仓库
echo "推送镜像到阿里云仓库..."
docker push ${ALI_REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}

echo "构建和推送完成！" 