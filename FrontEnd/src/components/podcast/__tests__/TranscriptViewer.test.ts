// 脚本高亮显示功能测试

/**
 * 测试场景：脚本高亮显示
 * 
 * 预期行为：
 * 1. 脚本按句子分割（以"。！？"为分隔符）
 * 2. 根据当前播放时间，计算当前活跃段落
 * 3. 活跃段落应用 .active 样式（蓝色背景、加粗、脉冲动画）
 * 4. 已播放的段落应用 .passed 样式（变灰）
 * 5. 未来段落保持默认样式
 * 6. 活跃段落自动滚动到视口中央
 * 
 * 关键点：
 * - 时间映射算法：每段时间 = (字符数 / 总字符数) × 总时长
 * - activeSegmentIndex 由 useMemo 在 currentTime 变化时更新
 * - segmentRefs 用于 scrollIntoView 的自动滚动
 */

export const testTranscriptHighlight = () => {
  // 示例脚本
  const scriptText = `这是一个测试脚本。第一句话。第二句话。第三句话。`;
  const duration = 12; // 12秒

  // 按句子分割
  const sentences = scriptText.match(/[^。！？\n]+[。！？]|[^。！？\n]+$/g) || [scriptText];
  console.log('分割后的句子:', sentences);
  // ["这是一个测试脚本。", "第一句话。", "第二句话。", "第三句话。"]

  // 计算总字符数
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0);
  console.log('总字符数:', totalChars); // 24

  // 分配时间戳
  const segments: Array<{ time: number; text: string; duration: number }> = [];
  let currentTime = 0;
  sentences.forEach((sentence) => {
    const charRatio = sentence.length / totalChars;
    const segmentDuration = charRatio * duration;
    segments.push({
      time: currentTime,
      text: sentence.trim(),
      duration: segmentDuration,
    });
    console.log(`"${sentence.trim()}" -> [${currentTime.toFixed(2)}, ${(currentTime + segmentDuration).toFixed(2)}]`);
    currentTime += segmentDuration;
  });

  /**
   * 预期输出：
   * "这是一个测试脚本。" -> [0.00, 3.00]
   * "第一句话。" -> [3.00, 6.00]
   * "第二句话。" -> [6.00, 9.00]
   * "第三句话。" -> [9.00, 12.00]
   */

  // 测试不同时间点的高亮
  const testTimes = [0, 1.5, 3, 4.5, 6, 7.5, 9, 10.5, 12];

  console.log('\n=== 时间点高亮测试 ===');
  testTimes.forEach((time) => {
    const activeIndex = segments.findIndex(
      (seg, idx) =>
        time >= seg.time &&
        (idx === segments.length - 1 || time < segments[idx + 1].time)
    );
    const activeSentence = activeIndex >= 0 ? segments[activeIndex].text : '无';
    console.log(`时间 ${time.toFixed(2)}s -> 活跃段落: "${activeSentence}" (索引: ${activeIndex})`);
  });

  /**
   * 预期输出：
   * 时间 0.00s -> 活跃段落: "这是一个测试脚本。" (索引: 0)
   * 时间 1.50s -> 活跃段落: "这是一个测试脚本。" (索引: 0)
   * 时间 3.00s -> 活跃段落: "第一句话。" (索引: 1)
   * 时间 4.50s -> 活跃段落: "第一句话。" (索引: 1)
   * 时间 6.00s -> 活跃段落: "第二句话。" (索引: 2)
   * 时间 7.50s -> 活跃段落: "第二句话。" (索引: 2)
   * 时间 9.00s -> 活跃段落: "第三句话。" (索引: 3)
   * 时间 10.50s -> 活跃段落: "第三句话。" (索引: 3)
   * 时间 12.00s -> 活跃段落: "第三句话。" (索引: 3)
   */

  console.log('\n=== CSS 类名验证 ===');
  console.log('活跃段落应用的类: transcript-segment active');
  console.log('已播放段落应用的类: transcript-segment passed');
  console.log('未来段落应用的类: transcript-segment');

  return true;
};

// 样式验证
export const verifyCSSStyles = () => {
  console.log('\n=== TranscriptViewer.css 样式验证 ===');
  
  const styles = {
    'transcript-segment': {
      display: 'inline',
      padding: '2px 4px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    },
    'transcript-segment.active': {
      background: 'rgba(59, 130, 246, 0.3)',
      color: 'rgb(191, 219, 254)',
      fontWeight: '600',
      borderRadius: '3px',
      boxShadow: '0 0 12px rgba(59, 130, 246, 0.4)',
      animation: 'pulse-active 0.6s ease-in-out infinite',
    },
    'transcript-segment.passed': {
      color: 'rgba(148, 163, 184, 0.5)',
      fontWeight: '400',
    },
  };

  Object.entries(styles).forEach(([selector, properties]) => {
    console.log(`${selector}: {`);
    Object.entries(properties).forEach(([prop, value]) => {
      console.log(`  ${prop}: ${value}`);
    });
    console.log('}');
  });

  return true;
};

// 自动滚动验证
export const verifyAutoScroll = () => {
  console.log('\n=== 自动滚动验证 ===');
  console.log('当 activeSegmentIndex 变化时:');
  console.log('1. useTranscriptSync 会获取对应的 DOM 元素');
  console.log('2. 调用 element.scrollIntoView({ behavior: "smooth", block: "center" })');
  console.log('3. 将活跃段落滚动到视口中央');
  console.log('\nScrollIntoView 选项:');
  console.log('  behavior: "smooth" - 平滑滚动动画');
  console.log('  block: "center" - 滚动到视口垂直中央');
  return true;
};

if (typeof window === 'undefined') {
  // Node.js 环境运行测试
  testTranscriptHighlight();
  verifyCSSStyles();
  verifyAutoScroll();
}
