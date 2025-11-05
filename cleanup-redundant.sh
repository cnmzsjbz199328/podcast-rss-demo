#!/bin/bash

# 🚨 冗余代码安全删除脚本
# 执行前务必备份代码和运行完整测试

set -e  # 遇到错误立即退出

echo "🧹 开始冗余代码清理..."
echo "⚠️  请确保已备份代码并运行完整测试"
echo ""

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# 阶段1: 删除未使用的服务工厂
stage1_cleanup() {
    log_info "阶段1: 删除未使用的服务工厂"

    if [ -f "src/factory.js" ]; then
        log_warn "删除 src/factory.js (242行)"
        rm src/factory.js
        log_success "已删除 src/factory.js"
    else
        log_warn "src/factory.js 已被删除或不存在"
    fi

    echo ""
}

# 阶段2: 删除复杂配置系统
stage2_cleanup() {
    log_info "阶段2: 删除复杂配置系统"

    if [ -f "src/config/index.js" ]; then
        log_warn "删除 src/config/index.js (262行)"
        rm src/config/index.js
        log_success "已删除 src/config/index.js"
    else
        log_warn "src/config/index.js 已被删除或不存在"
    fi

    if [ -f "src/config/validation.js" ]; then
        log_warn "删除 src/config/validation.js (190行)"
        rm src/config/validation.js
        log_success "已删除 src/config/validation.js"
    else
        log_warn "src/config/validation.js 已被删除或不存在"
    fi

    echo ""
}

# 阶段3: 可选删除类型定义
stage3_cleanup() {
    log_info "阶段3: 可选删除类型定义"

    read -p "是否删除 TypeScript 类型定义文件? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "src/types/index.js" ]; then
            log_warn "删除 src/types/index.js (86行)"
            rm src/types/index.js
            log_success "已删除 src/types/index.js"
        else
            log_warn "src/types/index.js 已被删除或不存在"
        fi
    else
        log_info "保留类型定义文件"
    fi

    echo ""
}

# 阶段4: 可选删除统计功能
stage4_cleanup() {
    log_info "阶段4: 可选删除统计功能"

    read -p "是否删除统计功能 (StatisticsRepository.js)? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        if [ -f "src/repositories/StatisticsRepository.js" ]; then
            log_warn "删除 src/repositories/StatisticsRepository.js (144行)"

            # 同时清理D1DatabaseService中的统计相关代码
            log_warn "清理 D1DatabaseService.js 中的统计代码"
            sed -i '/statistics:/d' src/implementations/D1DatabaseService.js
            sed -i '/getStatistics/d' src/implementations/D1DatabaseService.js
            sed -i '/getTtsStatistics/d' src/implementations/D1DatabaseService.js
            sed -i '/getRecentStatistics/d' src/implementations/D1DatabaseService.js

            # 清理import语句
            sed -i '/StatisticsRepository/d' src/implementations/D1DatabaseService.js

            rm src/repositories/StatisticsRepository.js
            log_success "已删除统计功能相关代码"
        else
            log_warn "src/repositories/StatisticsRepository.js 已被删除或不存在"
        fi
    else
        log_info "保留统计功能"
    fi

    echo ""
}

# 验证删除结果
verify_cleanup() {
    log_info "验证删除结果"

    # 检查是否还有对已删除文件的引用
    log_info "检查剩余引用..."

    if grep -r "loadConfig\|getStyleConfig\|getServiceConfig" src/ 2>/dev/null; then
        log_error "发现对已删除配置函数的引用！"
        grep -r "loadConfig\|getStyleConfig\|getServiceConfig" src/
        exit 1
    else
        log_success "未发现对已删除配置函数的引用"
    fi

    if grep -r "StatisticsRepository" src/ 2>/dev/null; then
        log_error "发现对StatisticsRepository的引用！"
        grep -r "StatisticsRepository" src/
        exit 1
    else
        log_success "未发现对StatisticsRepository的引用"
    fi

    # 统计删除的行数
    log_info "清理统计:"
    echo "已删除文件数量: $(find . -name "*.js" -path "./src/*" | wc -l) 个文件保留"
    echo "总代码行数: $(find src -name "*.js" -exec wc -l {} \; | awk '{sum += $1} END {print sum}') 行"

    log_success "验证完成"
}

# 运行测试
run_tests() {
    log_info "运行测试验证"

    if command -v npm &> /dev/null; then
        log_info "运行集成测试..."
        if npm run test:integration 2>/dev/null; then
            log_success "集成测试通过"
        else
            log_error "集成测试失败！请检查删除是否影响了功能"
            exit 1
        fi
    else
        log_warn "未找到npm，跳过测试验证"
    fi
}

# 主函数
main() {
    echo "╔══════════════════════════════════════════════╗"
    echo "║        🔍 冗余代码安全删除工具              ║"
    echo "║                                              ║"
    echo "║  🚨 请确保已备份代码并运行完整测试          ║"
    echo "║  📊 预计减少: 694行代码 (约30%)            ║"
    echo "╚══════════════════════════════════════════════╝"
    echo ""

    # 确认执行
    read -p "确定要开始清理吗? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "操作已取消"
        exit 0
    fi

    echo ""

    # 执行各阶段清理
    stage1_cleanup
    stage2_cleanup
    stage3_cleanup
    stage4_cleanup

    # 验证结果
    verify_cleanup

    # 运行测试
    run_tests

    echo ""
    log_success "🎉 冗余代码清理完成！"
    log_info "请运行以下命令验证功能："
    echo "  npm run deploy"
    echo "  npm run test:integration"
    echo ""
}

# 执行主函数
main "$@"
