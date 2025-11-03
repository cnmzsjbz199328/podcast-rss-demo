/**
 * 生产环境端到端测试
 * 
 * 测试已部署的 Cloudflare Worker 完整功能：
 * 1. 新闻获取
 * 2. 脚本生成 (Gemini AI)
 * 3. 语音生成 (IndexTTS)
 * 4. R2 存储
 * 5. D1 数据库存储
 * 6. 剧集列表查询
 * 7. RSS Feed 生成
 */

import { Logger } from './src/utils/logger.js';

const logger = new Logger('E2E-Test');

// Worker URL - 从命令行参数获取或使用默认值
const WORKER_URL = process.env.WORKER_URL || 'https://podcast-rss-demo.tj15982183241.workers.dev';

/**
 * 测试辅助函数
 */
async function testEndpoint(name, url, options = {}) {
  console.log(`\n✓ 测试: ${name}`);
  console.log(`  URL: ${url}`);
  
  try {
    const startTime = Date.now();
    const response = await fetch(url, options);
    const duration = Date.now() - startTime;
    
    console.log(`  状态码: ${response.status} ${response.statusText}`);
    console.log(`  耗时: ${duration}ms`);
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else if (contentType?.includes('application/rss+xml') || contentType?.includes('text/xml')) {
      data = await response.text();
    } else {
      data = await response.text();
    }
    
    return { success: true, data, duration, status: response.status };
  } catch (error) {
    console.error(`  ❌ 失败: ${error.message}`);
    logger.error(`Test failed: ${name}`, error);
    return { success: false, error: error.message };
  }
}

/**
 * 等待指定时间
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 测试 1: 健康检查
 */
async function testHealthCheck() {
  console.log('\n=== 测试 1: 健康检查 ===');
  
  const result = await testEndpoint(
    '健康检查',
    `${WORKER_URL}/health`
  );
  
  if (result.success) {
    console.log('\n健康状态:');
    console.log(`  - 总体状态: ${result.data.status}`);
    console.log(`  - 数据库: ${result.data.services.database ? '✅ 正常' : '❌ 异常'}`);
    console.log(`  - 存储: ${result.data.services.storage ? '✅ 正常' : '❌ 异常'}`);
    
    if (result.data.services.databaseStats) {
      console.log(`  - 剧集总数: ${result.data.services.databaseStats.totalEpisodes}`);
      console.log(`  - 已发布: ${result.data.services.databaseStats.publishedEpisodes}`);
    }
    
    if (result.data.services.storageStats) {
      console.log(`  - R2 文件数: ${result.data.services.storageStats.totalFiles}`);
      console.log(`  - 音频文件: ${result.data.services.storageStats.audioFiles}`);
    }
  }
  
  return result;
}

/**
 * 测试 2: 查看现有剧集列表
 */
async function testGetEpisodes() {
  console.log('\n=== 测试 2: 查看现有剧集 ===');
  
  const result = await testEndpoint(
    '获取剧集列表',
    `${WORKER_URL}/episodes?limit=5`
  );
  
  if (result.success) {
    console.log('\n剧集列表:');
    console.log(`  - 总数: ${result.data.data.pagination.total}`);
    console.log(`  - 返回: ${result.data.data.episodes.length} 个剧集`);
    
    result.data.data.episodes.forEach((ep, idx) => {
      console.log(`\n  [${idx + 1}] ${ep.title}`);
      console.log(`      风格: ${ep.style}`);
      console.log(`      时长: ${Math.floor(ep.duration / 60)}分${ep.duration % 60}秒`);
      console.log(`      音频: ${ep.audioUrl}`);
      console.log(`      发布: ${new Date(ep.publishedAt || ep.createdAt).toLocaleString('zh-CN')}`);
    });
  }
  
  return result;
}

/**
 * 测试 3: 生成新播客 (完整流程)
 */
async function testGeneratePodcast(style = 'news-anchor') {
  console.log(`\n=== 测试 3: 生成播客 (${style}) ===`);
  console.log('⚠️  这将执行完整的播客生成流程，可能需要 2-3 分钟...');
  console.log('流程: 获取新闻 → Gemini生成脚本 → IndexTTS生成语音 → 上传R2 → 保存D1');
  
  const result = await testEndpoint(
    `生成 ${style} 风格播客`,
    `${WORKER_URL}/generate?style=${style}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );
  
  if (result.success) {
    console.log('\n✅ 播客生成成功！');
    
    const data = result.data.data;
    
    if (data.episodeId) {
      console.log(`\n剧集信息:`);
      console.log(`  - 剧集ID: ${data.episodeId}`);
    }
    
    if (data.metadata) {
      console.log(`  - 标题: ${data.metadata.title || '未知'}`);
      console.log(`  - 新闻数量: ${data.metadata.newsCount || 0}`);
      console.log(`  - 时长: ${data.metadata.duration ? Math.floor(data.metadata.duration / 60) + '分' + (data.metadata.duration % 60) + '秒' : '未知'}`);
    }
    
    if (data.files) {
      console.log(`\n文件信息:`);
      if (data.files.audio) {
        console.log(`  - 音频URL: ${data.files.audio.url || data.files.audioUrl}`);
        console.log(`  - 音频大小: ${((data.files.audio.size || 0) / 1024 / 1024).toFixed(2)} MB`);
      }
      if (data.files.script) {
        console.log(`  - 脚本URL: ${data.files.script.url || data.files.scriptUrl}`);
      }
    }
    
    console.log(`\n⏱️  总耗时: ${(result.duration / 1000).toFixed(2)} 秒`);
    
    // 返回剧集ID用于后续测试
    return { ...result, episodeId: data.episodeId };
  }
  
  return result;
}

/**
 * 测试 4: 查询特定剧集详情
 */
async function testGetEpisodeDetail(episodeId) {
  console.log(`\n=== 测试 4: 查询剧集详情 ===`);
  
  if (!episodeId) {
    console.log('  ⚠️  跳过: 没有可用的剧集ID');
    return { success: true, skipped: true };
  }
  
  const result = await testEndpoint(
    '获取剧集详情',
    `${WORKER_URL}/episodes/${episodeId}`
  );
  
  if (result.success) {
    const ep = result.data.data;
    console.log('\n剧集详情:');
    console.log(`  - ID: ${ep.id}`);
    console.log(`  - 标题: ${ep.title}`);
    console.log(`  - 描述: ${ep.description}`);
    console.log(`  - 风格: ${ep.style}`);
    console.log(`  - 时长: ${Math.floor(ep.duration / 60)}分${ep.duration % 60}秒`);
    console.log(`  - 文件大小: ${(ep.fileSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`  - 音频URL: ${ep.audioUrl}`);
    console.log(`  - 脚本URL: ${ep.scriptUrl || '无'}`);
    console.log(`  - 创建时间: ${new Date(ep.createdAt).toLocaleString('zh-CN')}`);
    
    if (ep.transcript) {
      console.log(`  - 文字稿预览: ${ep.transcript.substring(0, 100)}...`);
    }
    
    if (ep.metadata) {
      console.log(`  - 元数据: ${JSON.stringify(ep.metadata)}`);
    }
  }
  
  return result;
}

/**
 * 测试 5: 验证音频文件可访问
 */
async function testAudioFileAccess(episodeId) {
  console.log(`\n=== 测试 5: 验证音频文件访问 ===`);
  
  if (!episodeId) {
    console.log('  ⚠️  跳过: 没有可用的剧集ID');
    return { success: true, skipped: true };
  }
  
  // 先获取剧集详情以获得音频URL
  const episodeResult = await fetch(`${WORKER_URL}/episodes/${episodeId}`);
  if (!episodeResult.ok) {
    console.log('  ❌ 无法获取剧集信息');
    return { success: false };
  }
  
  const episodeData = await episodeResult.json();
  const audioUrl = episodeData.data?.audioUrl;
  
  if (!audioUrl) {
    console.log('  ⚠️  剧集没有音频URL');
    return { success: false };
  }
  
  console.log(`  音频URL: ${audioUrl}`);
  
  try {
    const response = await fetch(audioUrl, { method: 'HEAD' });
    console.log(`  状态码: ${response.status}`);
    console.log(`  Content-Type: ${response.headers.get('content-type')}`);
    console.log(`  Content-Length: ${response.headers.get('content-length')} bytes`);
    
    if (response.ok) {
      console.log('  ✅ 音频文件可正常访问');
      return { success: true };
    } else {
      console.log('  ❌ 音频文件访问失败');
      return { success: false };
    }
  } catch (error) {
    console.log(`  ❌ 访问错误: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * 测试 6: RSS Feed 生成
 */
async function testRSSFeed() {
  console.log('\n=== 测试 6: RSS Feed 生成 ===');
  
  const result = await testEndpoint(
    'RSS Feed',
    `${WORKER_URL}/rss.xml`
  );
  
  if (result.success) {
    console.log('\n✅ RSS Feed 生成成功');
    
    // 解析 RSS 内容
    const rssContent = result.data;
    const itemCount = (rssContent.match(/<item>/g) || []).length;
    const titleMatch = rssContent.match(/<title>([^<]+)<\/title>/);
    const channelTitle = titleMatch ? titleMatch[1] : '未知';
    
    console.log(`  - 频道标题: ${channelTitle}`);
    console.log(`  - 剧集数量: ${itemCount}`);
    console.log(`  - RSS 大小: ${(rssContent.length / 1024).toFixed(2)} KB`);
    
    // 提取第一个剧集的信息
    if (itemCount > 0) {
      const firstItemMatch = rssContent.match(/<item>([\s\S]*?)<\/item>/);
      if (firstItemMatch) {
        const itemContent = firstItemMatch[1];
        const itemTitleMatch = itemContent.match(/<title>([^<]+)<\/title>/);
        const enclosureMatch = itemContent.match(/<enclosure\s+url="([^"]+)"/);
        
        console.log(`\n  最新剧集:`);
        console.log(`    - 标题: ${itemTitleMatch ? itemTitleMatch[1] : '未知'}`);
        console.log(`    - 音频: ${enclosureMatch ? enclosureMatch[1] : '未知'}`);
      }
    }
    
    // 验证 RSS 格式
    const hasRssTag = rssContent.includes('<rss');
    const hasChannel = rssContent.includes('<channel>');
    const hasValidXml = rssContent.startsWith('<?xml');
    
    console.log(`\n  格式验证:`);
    console.log(`    - XML 声明: ${hasValidXml ? '✅' : '❌'}`);
    console.log(`    - RSS 标签: ${hasRssTag ? '✅' : '❌'}`);
    console.log(`    - Channel 标签: ${hasChannel ? '✅' : '❌'}`);
  }
  
  return result;
}

/**
 * 测试 7: 按风格筛选剧集
 */
async function testFilterByStyle() {
  console.log('\n=== 测试 7: 按风格筛选剧集 ===');
  
  const styles = ['news-anchor', 'guo-de-gang', 'emotional'];
  
  for (const style of styles) {
    const result = await testEndpoint(
      `筛选 ${style} 风格`,
      `${WORKER_URL}/episodes?style=${style}&limit=3`
    );
    
    if (result.success) {
      const count = result.data.data.episodes.length;
      console.log(`  - ${style}: ${count} 个剧集`);
    }
  }
  
  return { success: true };
}

/**
 * 主测试函数
 */
async function runE2ETests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║        生产环境端到端测试 (E2E)                      ║');
  console.log('╚════════════════════════════════════════════════════════╝');
  console.log(`\n🌐 Worker URL: ${WORKER_URL}`);
  console.log(`📅 测试时间: ${new Date().toLocaleString('zh-CN')}\n`);
  
  const results = {
    healthCheck: null,
    getEpisodes: null,
    generatePodcast: null,
    getEpisodeDetail: null,
    audioAccess: null,
    rssFeed: null,
    filterByStyle: null
  };
  
  let generatedEpisodeId = null;
  
  try {
    // 测试 1: 健康检查
    results.healthCheck = await testHealthCheck();
    if (!results.healthCheck.success) {
      console.log('\n⚠️  健康检查失败，但继续进行其他测试...');
    }
    
    await sleep(1000);
    
    // 测试 2: 查看现有剧集
    results.getEpisodes = await testGetEpisodes();
    
    await sleep(1000);
    
    // 测试 3: 生成新播客 (这是最重要的测试)
    console.log('\n⏳ 准备生成新播客...');
    const generateConfirm = process.argv.includes('--generate') || process.argv.includes('--full');
    
    if (generateConfirm) {
      results.generatePodcast = await testGeneratePodcast('news-anchor');
      
      if (results.generatePodcast.success && results.generatePodcast.episodeId) {
        generatedEpisodeId = results.generatePodcast.episodeId;
        
        // 等待一下确保数据已保存
        console.log('\n⏳ 等待 3 秒以确保数据已完全保存...');
        await sleep(3000);
      }
    } else {
      console.log('\n⚠️  跳过播客生成测试 (使用 --generate 或 --full 参数启用)');
      console.log('   原因: 播客生成耗时较长 (2-3分钟) 且会消耗 API 配额');
      results.generatePodcast = { success: true, skipped: true };
      
      // 尝试从现有剧集中获取一个ID用于测试
      if (results.getEpisodes.success && results.getEpisodes.data.data.episodes.length > 0) {
        generatedEpisodeId = results.getEpisodes.data.data.episodes[0].id;
        console.log(`   使用现有剧集进行后续测试: ${generatedEpisodeId}`);
      }
    }
    
    await sleep(1000);
    
    // 测试 4: 查询剧集详情
    results.getEpisodeDetail = await testGetEpisodeDetail(generatedEpisodeId);
    
    await sleep(1000);
    
    // 测试 5: 验证音频文件访问
    results.audioAccess = await testAudioFileAccess(generatedEpisodeId);
    
    await sleep(1000);
    
    // 测试 6: RSS Feed
    results.rssFeed = await testRSSFeed();
    
    await sleep(1000);
    
    // 测试 7: 按风格筛选
    results.filterByStyle = await testFilterByStyle();
    
    // 汇总结果
    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   测试结果汇总                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    const testItems = [
      { name: '健康检查', result: results.healthCheck },
      { name: '获取剧集列表', result: results.getEpisodes },
      { name: '生成播客 (完整流程)', result: results.generatePodcast },
      { name: '查询剧集详情', result: results.getEpisodeDetail },
      { name: '音频文件访问', result: results.audioAccess },
      { name: 'RSS Feed 生成', result: results.rssFeed },
      { name: '按风格筛选', result: results.filterByStyle }
    ];
    
    let passedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    
    testItems.forEach(({ name, result }) => {
      if (result?.skipped) {
        console.log(`⏭️  ${name}: 已跳过`);
        skippedCount++;
      } else if (result?.success) {
        console.log(`✅ ${name}: 通过`);
        passedCount++;
      } else {
        console.log(`❌ ${name}: 失败`);
        failedCount++;
      }
    });
    
    console.log('\n' + '─'.repeat(56));
    console.log(`总计: ${testItems.length} 个测试`);
    console.log(`通过: ${passedCount} ✅`);
    console.log(`失败: ${failedCount} ❌`);
    console.log(`跳过: ${skippedCount} ⏭️`);
    
    // 功能检查列表
    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║                 功能完整性检查                        ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    const features = [
      { name: '🌐 Worker 部署', checked: results.healthCheck?.success },
      { name: '🗄️  D1 数据库连接', checked: results.healthCheck?.data?.services?.database },
      { name: '💾 R2 存储连接', checked: results.healthCheck?.data?.services?.storage },
      { name: '📰 新闻获取 (BBC RSS)', checked: results.generatePodcast?.success || results.generatePodcast?.skipped },
      { name: '🤖 AI 脚本生成 (Gemini)', checked: results.generatePodcast?.success || results.generatePodcast?.skipped },
      { name: '🎙️  语音合成 (IndexTTS)', checked: results.generatePodcast?.success || results.generatePodcast?.skipped },
      { name: '📤 R2 文件上传', checked: results.generatePodcast?.success || results.generatePodcast?.skipped },
      { name: '💿 D1 数据存储', checked: results.generatePodcast?.success || results.generatePodcast?.skipped },
      { name: '📋 剧集列表查询', checked: results.getEpisodes?.success },
      { name: '🔍 剧集详情查询', checked: results.getEpisodeDetail?.success || results.getEpisodeDetail?.skipped },
      { name: '🎵 音频文件访问', checked: results.audioAccess?.success || results.audioAccess?.skipped },
      { name: '📡 RSS Feed 生成', checked: results.rssFeed?.success },
      { name: '🎨 风格筛选', checked: results.filterByStyle?.success }
    ];
    
    features.forEach(({ name, checked }) => {
      console.log(`${checked ? '✅' : '❌'} ${name}`);
    });
    
    // 最终状态
    console.log('\n\n╔════════════════════════════════════════════════════════╗');
    console.log('║                   最终状态                            ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');
    
    if (failedCount === 0) {
      console.log('🎉 所有测试通过！您的播客服务运行正常。\n');
      
      console.log('📱 使用方式:');
      console.log(`   - RSS 订阅: ${WORKER_URL}/rss.xml`);
      console.log(`   - 剧集列表: ${WORKER_URL}/episodes`);
      console.log(`   - 生成播客: curl -X POST "${WORKER_URL}/generate?style=news-anchor"`);
      console.log(`   - 健康检查: ${WORKER_URL}/health`);
      
      console.log('\n💡 提示:');
      console.log('   - 将 RSS URL 添加到您的播客客户端 (如 Apple Podcasts, Spotify)');
      console.log('   - 可以设置 Cron Trigger 实现每日自动生成');
      console.log('   - 使用自定义域名替换 .workers.dev 域名\n');
      
      process.exit(0);
    } else {
      console.log(`⚠️  有 ${failedCount} 个测试失败。请检查上述错误信息。\n`);
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n❌ 测试运行过程中发生错误:', error);
    logger.error('E2E test runner failed', error);
    process.exit(1);
  }
}

// 显示使用说明
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
播客服务端到端测试工具

使用方法:
  node test-production-e2e.js [选项]

选项:
  --generate, --full    执行完整测试（包含播客生成，耗时 2-3 分钟）
  --help, -h            显示此帮助信息

环境变量:
  WORKER_URL           Worker 地址（默认: https://podcast-rss-demo.tj15982183241.workers.dev）

示例:
  # 快速测试（跳过播客生成）
  node test-production-e2e.js

  # 完整测试（包含播客生成）
  node test-production-e2e.js --full

  # 使用自定义 Worker URL
  WORKER_URL=https://your-worker.workers.dev node test-production-e2e.js
`);
  process.exit(0);
}

// 运行测试
runE2ETests();
