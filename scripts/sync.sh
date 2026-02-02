#!/bin/bash

# 同步 Sub-Store 上游仓库的 proxy-utils 相关文件夹
# 从 github.com/sub-store-org/Sub-Store 拉取最新提交并覆盖本项目的对应文件夹

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# 项目根目录
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# 上游仓库地址
UPSTREAM_REPO="https://github.com/sub-store-org/Sub-Store.git"

# 临时目录
TEMP_DIR=$(mktemp -d)

# 需要同步的文件夹（相对于 backend/src/core/proxy-utils/ 的路径）
SYNC_FOLDERS=(
    "parsers"
    "preprocessors"
    "producers"
)

# 本项目的目标目录
TARGET_BASE="$PROJECT_ROOT/backend/src/core/proxy-utils"

# 清理函数
cleanup() {
    echo -e "${YELLOW}清理临时文件...${NC}"
    rm -rf "$TEMP_DIR"
    echo -e "${GREEN}清理完成${NC}"
}

# 设置退出时自动清理
trap cleanup EXIT

echo -e "${YELLOW}[1/4] 克隆上游仓库最新提交...${NC}"

git clone --depth=1 "$UPSTREAM_REPO" "$TEMP_DIR/Sub-Store"

if [ ! -d "$TEMP_DIR/Sub-Store" ]; then
    echo -e "${RED}错误: 克隆仓库失败${NC}"
    exit 1
fi

echo -e "${GREEN}克隆完成${NC}"
echo ""

# 上游仓库的源目录
SOURCE_BASE="$TEMP_DIR/Sub-Store/backend/src/core/proxy-utils"

echo -e "${YELLOW}[2/4] 检查源文件夹是否存在...${NC}"
for folder in "${SYNC_FOLDERS[@]}"; do
    if [ ! -d "$SOURCE_BASE/$folder" ]; then
        echo -e "${RED}错误: 源文件夹不存在 - $SOURCE_BASE/$folder${NC}"
        exit 1
    fi
    echo -e "  ${GREEN}✓${NC} $folder"
done
echo ""

echo -e "${YELLOW}[3/4] 删除本项目的目标文件夹...${NC}"
for folder in "${SYNC_FOLDERS[@]}"; do
    target_path="$TARGET_BASE/$folder"
    if [ -d "$target_path" ]; then
        rm -rf "$target_path"
        echo -e "  ${GREEN}✓${NC} 已删除: $folder"
    else
        echo -e "  ${YELLOW}!${NC} 文件夹不存在，跳过: $folder"
    fi
done
echo ""

echo -e "${YELLOW}[4/4] 复制上游文件夹到本项目...${NC}"
for folder in "${SYNC_FOLDERS[@]}"; do
    source_path="$SOURCE_BASE/$folder"
    target_path="$TARGET_BASE/$folder"
    
    cp -r "$source_path" "$target_path"
    
    # 统计文件数量
    file_count=$(find "$target_path" -type f | wc -l)
    echo -e "  ${GREEN}✓${NC} 已复制: $folder (${file_count} 个文件)"
done
echo ""

echo -e "${GREEN}  同步完成！${NC}"
echo ""
echo "已同步的文件夹:"
for folder in "${SYNC_FOLDERS[@]}"; do
    echo "  - backend/src/core/proxy-utils/$folder"
done
