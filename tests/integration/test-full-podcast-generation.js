#!/usr/bin/env node

/**
 * 完整播客生成流程集成测试
 * 
 * 测试完整的端到端播客生成流程：
 * 1. 发起播客生成请求
 * 2. 验证初始响应数据
 * 3. 轮询音频生成状态
 * 4. 验证最终生成的音频文件
 * 5. 检查数据库存储
 * 6. 验证 RSS Feed 更新
 * 
 * 用法:
 *   node tests/integration/test-full-podcast-generation.js [options]
 * 
 * 选项:
 *   --style=<style>      指定风格 (默认: news-anchor)
 *   --timeout=<seconds>  最大等待时间，秒 (默认: 180)
 *   --verbose           显示详细日志
 *   --skip-audio-check  跳过音频文件下载验证
 */

const BASE_URL = process.env.WORKER_URL || 'https://podcast-rss-demo.tj15982183241.workers.dev';

// 解析命令行参数
const args = process.argv.slice(2);
const options = {
  style: 'news-anchor',
  timeout: 180,
  verbose: false,
  skipAudioCheck: false
};

args.forEach(arg => {
  if (arg.startsWith('--style=')) {
    options.style = arg.split('=')[1];
  } else if (arg.startsWith('--timeout=')) {
    options.timeout = parseInt(arg.split('=')[1]);
  } else if (arg === '--verbose') {
    options.verbose = true;
  } else if (arg === '--skip-audio-check') {
    options.skipAudioCheck = true;
  } else if (arg === '--help' || arg === '-h') {
    console.log(`
完整播客生成流程集成测试

用法:
  node tests/integration/test-full-podcast-generation.js [options]

选项:
  --style=<style>      指定播客风格 (news-anchor, guo-de-gang, emotional)
  --timeout=<seconds>  最大等待时间，秒 (默认: 180)
  --verbose           显示详细日志
  --skip-audio-check  跳过音频文件下载验证
  --help, -h          显示此帮助信息

示例:
  # 使用默认参数测试
  node tests/integration/test-full-podcast-generation.js

  # 测试郭德纲风格，最多等待5分钟
  node tests/integration/test-full-podcast-generation.js --style=guo-de-gang --timeout=300

  # 详细模式
  node tests/integration/test-full-podcast-generation.js --verbose

环境变量:
  WORKER_URL          Worker地址 (默认: https://podcast-rss-demo.tj15982183241.workers.dev)
`);
    process.exit(0);
  }
});

// 工具函数
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function log(message, level = 'info') {
  const timestamp = new Date().toISOString().substring(11, 19);
  const prefix = {
    info: '📝',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    debug: '🔍'
  }[level] || '📝';
  
  console.log(`[${timestamp}] ${prefix} ${message}`);
}

function formatDuration(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}分${secs}秒`;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// 测试类
class PodcastGenerationTest {
  constructor(options) {
    this.options = options;
    this.startTime = Date.now();
    this.episodeId = null;
    this.eventId = null;
    this.results = {
      generation: null,
      polling: null,
      audioVerification: null,
      databaseCheck: null,
      rssFeedCheck: null
    };
  }

  /**
   * 步骤 1: 发起播客生成请求
   */
  async testPodcastGeneration() {
    log(`开始测试播客生成 (风格: ${this.options.style})`, 'info');
    log(`Worker URL: ${BASE_URL}`, 'debug');
    
    const url = `${BASE_URL}/generate?style=${this.options.style}`;
    
    try {
      const requestStart = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const requestDuration = Date.now() - requestStart;
      log(`请求耗时: ${(requestDuration / 1000).toFixed(2)}秒`, 'debug');
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.substring(0, 200)}`);
      }
      
      const result = await response.json();
      
      if (this.options.verbose) {
        log(`完整响应: ${JSON.stringify(result, null, 2)}`, 'debug');
      }
      
      if (!result.success) {
        throw new Error(`API返回失败: ${result.error || '未知错误'}`);
      }
      
      const data = result.data;
      
      // 提取关键信息
      this.episodeId = data.episodeId;
      this.eventId = data.eventId || data.ttsEventId;
      
      // 验证响应数据
      const validations = {
        'Episode ID 存在': !!this.episodeId,
        'Event ID 存在': !!this.eventId,
        '标题存在': !!data.title,
        '风格匹配': data.style === this.options.style,
        '是异步模式': data.isAsync === true
      };
      
      let validationPassed = true;
      log('响应数据验证:', 'info');
      Object.entries(validations).forEach(([check, passed]) => {
        log(`  ${check}: ${passed ? '✓' : '✗'}`, passed ? 'success' : 'error');
        if (!passed) validationPassed = false;
      });
      
      if (!validationPassed) {
        throw new Error('响应数据验证失败');
      }
      
      // 记录生成信息
      log(`播客生成请求成功`, 'success');
      log(`  Episode ID: ${this.episodeId}`, 'info');
      log(`  Event ID: ${this.eventId}`, 'info');
      log(`  标题: ${data.title}`, 'info');
      log(`  风格: ${data.style}`, 'info');
      log(`  异步模式: ${data.isAsync ? '是' : '否'}`, 'info');
      log(`  TTS 状态: ${data.ttsStatus}`, 'info');
      
      if (data.metadata) {
        log(`  新闻数量: ${data.metadata.newsCount || 'N/A'}`, 'info');
        log(`  字数: ${data.metadata.wordCount || 'N/A'}`, 'info');
        log(`  预估时长: ${data.metadata.duration ? formatDuration(data.metadata.duration) : 'N/A'}`, 'info');
      }
      
      this.results.generation = {
        success: true,
        duration: requestDuration,
        episodeId: this.episodeId,
        eventId: this.eventId,
        data: data
      };
      
      return true;
      
    } catch (error) {
      log(`播客生成失败: ${error.message}`, 'error');
      this.results.generation = {
        success: false,
        error: error.message
      };
      throw error;
    }
  }

  /**
   * 步骤 2: 轮询音频生成状态
   */
  async testAudioPolling() {
    if (!this.episodeId) {
      throw new Error('没有可用的 Episode ID');
    }
    
    log('开始轮询音频生成状态', 'info');
    log(`  Episode ID: ${this.episodeId}`, 'debug');
    log(`  最大等待时间: ${this.options.timeout}秒`, 'debug');
    
    const pollInterval = 5000; // 5秒
    const maxAttempts = Math.floor(this.options.timeout * 1000 / pollInterval);
    const pollStartTime = Date.now();
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const elapsed = Math.floor((Date.now() - pollStartTime) / 1000);
      log(`[${attempt}/${maxAttempts}] 轮询中... (已等待 ${elapsed}秒)`, 'debug');
      
      try {
        const response = await fetch(`${BASE_URL}/episodes/${this.episodeId}/poll-audio`, {
          method: 'POST'
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          log(`轮询请求失败 (${response.status}): ${errorText.substring(0, 100)}`, 'warning');
          
          if (attempt < maxAttempts) {
            await sleep(pollInterval);
            continue;
          } else {
            throw new Error(`轮询失败: HTTP ${response.status}`);
          }
        }
        
        const result = await response.json();
        
        if (this.options.verbose) {
          log(`轮询响应: ${JSON.stringify(result)}`, 'debug');
        }
        
        const status = result.status;
        
        if (status === 'completed') {
          const pollDuration = Date.now() - pollStartTime;
          log(`音频生成完成！`, 'success');
          log(`  等待时间: ${(pollDuration / 1000).toFixed(2)}秒`, 'info');
          log(`  Audio URL: ${result.audioUrl}`, 'info');
          log(`  文件大小: ${formatBytes(result.fileSize || 0)}`, 'info');
          
          this.results.polling = {
            success: true,
            duration: pollDuration,
            attempts: attempt,
            audioUrl: result.audioUrl,
            fileSize: result.fileSize
          };
          
          return result;
          
        } else if (status === 'failed') {
          log(`音频生成失败: ${result.error}`, 'error');
          this.results.polling = {
            success: false,
            error: result.error,
            attempts: attempt
          };
          throw new Error(`音频生成失败: ${result.error}`);
          
        } else if (status === 'processing' || status === 'pending') {
          log(`  状态: ${status} ${result.message || ''}`, 'debug');
          
          if (attempt < maxAttempts) {
            await sleep(pollInterval);
          }
        } else {
          log(`  未知状态: ${status}`, 'warning');
          
          if (attempt < maxAttempts) {
            await sleep(pollInterval);
          }
        }
        
      } catch (error) {
        if (attempt >= maxAttempts) {
          log(`轮询超时 (${this.options.timeout}秒)`, 'error');
          this.results.polling = {
            success: false,
            error: 'Timeout',
            attempts: attempt
          };
          throw error;
        }
        
        log(`轮询出错: ${error.message}，重试中...`, 'warning');
        await sleep(pollInterval);
      }
    }
    
    throw new Error(`轮询超时: 超过 ${this.options.timeout}秒`);
  }

  /**
   * 步骤 3: 验证音频文件
   */
  async testAudioVerification() {
    if (!this.results.polling?.audioUrl) {
      log('跳过音频验证: 没有音频URL', 'warning');
      this.results.audioVerification = { success: true, skipped: true };
      return true;
    }
    
    const audioUrl = this.results.polling.audioUrl;
    log('验证音频文件', 'info');
    log(`  URL: ${audioUrl}`, 'debug');
    
    try {
      // 1. 检查 HEAD 请求
      const headResponse = await fetch(audioUrl, { method: 'HEAD' });
      
      if (!headResponse.ok) {
        throw new Error(`音频文件无法访问: HTTP ${headResponse.status}`);
      }
      
      const contentType = headResponse.headers.get('content-type');
      const contentLength = parseInt(headResponse.headers.get('content-length') || '0');
      
      log(`  Content-Type: ${contentType}`, 'debug');
      log(`  Content-Length: ${formatBytes(contentLength)}`, 'debug');
      
      // 验证 Content-Type
      const validContentTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'];
      const isValidContentType = validContentTypes.some(type => contentType?.includes(type));
      
      if (!isValidContentType) {
        log(`  警告: Content-Type 不是音频格式: ${contentType}`, 'warning');
      }
      
      // 验证文件大小
      if (contentLength < 1000) {
        throw new Error(`音频文件太小 (${contentLength} bytes)，可能是错误文件`);
      }
      
      log(`音频文件验证通过`, 'success');
      log(`  格式: ${contentType}`, 'info');
      log(`  大小: ${formatBytes(contentLength)}`, 'info');
      
      // 2. 可选: 下载部分内容验证
      if (!this.options.skipAudioCheck) {
        log('下载音频样本验证...', 'debug');
        
        const sampleResponse = await fetch(audioUrl, {
          headers: {
            'Range': 'bytes=0-1023' // 下载前1KB
          }
        });
        
        if (sampleResponse.ok) {
          const buffer = await sampleResponse.arrayBuffer();
          log(`  下载样本: ${buffer.byteLength} bytes`, 'debug');
          
          // 检查是否是有效的音频文件头
          const bytes = new Uint8Array(buffer);
          const isMP3 = bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0; // MP3 magic number
          const isWAV = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46; // RIFF
          
          if (isMP3 || isWAV) {
            log(`  音频格式标识正确 (${isMP3 ? 'MP3' : 'WAV'})`, 'success');
          } else {
            log(`  警告: 音频格式标识可能不正确`, 'warning');
          }
        }
      }
      
      this.results.audioVerification = {
        success: true,
        contentType,
        contentLength,
        url: audioUrl
      };
      
      return true;
      
    } catch (error) {
      log(`音频验证失败: ${error.message}`, 'error');
      this.results.audioVerification = {
        success: false,
        error: error.message
      };
      throw error;
    }
  }

  /**
   * 步骤 4: 检查数据库存储
   */
  async testDatabaseCheck() {
    if (!this.episodeId) {
      throw new Error('没有可用的 Episode ID');
    }
    
    log('检查数据库存储', 'info');
    
    try {
      const response = await fetch(`${BASE_URL}/episodes/${this.episodeId}`);
      
      if (!response.ok) {
        throw new Error(`获取剧集详情失败: HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(`API返回失败: ${result.error}`);
      }
      
      const episode = result.data;
      
      // 验证数据完整性
      const checks = {
        'Episode ID': episode.id === this.episodeId,
        '标题': !!episode.title,
        '描述': !!episode.description,
        '风格': episode.style === this.options.style,
        '时长': episode.duration > 0,
        '音频URL': !!episode.audioUrl,
        '文件大小': episode.fileSize > 0,
        'TTS Event ID': !!episode.ttsEventId,
        'TTS 状态': episode.ttsStatus === 'completed',
        '创建时间': !!episode.createdAt
      };
      
      log('数据库数据验证:', 'info');
      let allPassed = true;
      Object.entries(checks).forEach(([field, passed]) => {
        log(`  ${field}: ${passed ? '✓' : '✗'}`, passed ? 'debug' : 'warning');
        if (!passed) allPassed = false;
      });
      
      if (episode.metadata && this.options.verbose) {
        log('元数据:', 'debug');
        log(`  ${JSON.stringify(episode.metadata, null, 2)}`, 'debug');
      }
      
      if (allPassed) {
        log('数据库检查通过', 'success');
      } else {
        log('数据库检查有警告项', 'warning');
      }
      
      this.results.databaseCheck = {
        success: allPassed,
        episode,
        checks
      };
      
      return true;
      
    } catch (error) {
      log(`数据库检查失败: ${error.message}`, 'error');
      this.results.databaseCheck = {
        success: false,
        error: error.message
      };
      throw error;
    }
  }

  /**
   * 步骤 5: 验证 RSS Feed 更新
   */
  async testRssFeedCheck() {
    log('检查 RSS Feed 更新', 'info');
    
    try {
      const response = await fetch(`${BASE_URL}/rss.xml`);
      
      if (!response.ok) {
        throw new Error(`RSS Feed 请求失败: HTTP ${response.status}`);
      }
      
      const rssContent = await response.text();
      
      // 检查 RSS 格式
      const hasValidXml = rssContent.startsWith('<?xml');
      const hasRssTag = rssContent.includes('<rss');
      const hasChannel = rssContent.includes('<channel>');
      
      if (!hasValidXml || !hasRssTag || !hasChannel) {
        throw new Error('RSS Feed 格式无效');
      }
      
      // 检查是否包含新生成的剧集
      const includesEpisode = rssContent.includes(this.episodeId);
      
      log('RSS Feed 验证:', 'info');
      log(`  XML 格式: ${hasValidXml ? '✓' : '✗'}`, hasValidXml ? 'debug' : 'error');
      log(`  RSS 标签: ${hasRssTag ? '✓' : '✗'}`, hasRssTag ? 'debug' : 'error');
      log(`  Channel 标签: ${hasChannel ? '✓' : '✗'}`, hasChannel ? 'debug' : 'error');
      log(`  包含新剧集: ${includesEpisode ? '✓' : '✗'}`, includesEpisode ? 'success' : 'warning');
      
      // 统计剧集数量
      const itemCount = (rssContent.match(/<item>/g) || []).length;
      log(`  总剧集数: ${itemCount}`, 'info');
      
      if (!includesEpisode) {
        log('警告: RSS Feed 中未找到新生成的剧集', 'warning');
      }
      
      this.results.rssFeedCheck = {
        success: hasValidXml && hasRssTag && hasChannel,
        includesEpisode,
        itemCount,
        feedSize: rssContent.length
      };
      
      log('RSS Feed 检查通过', 'success');
      return true;
      
    } catch (error) {
      log(`RSS Feed 检查失败: ${error.message}`, 'error');
      this.results.rssFeedCheck = {
        success: false,
        error: error.message
      };
      // RSS Feed 失败不应该导致整个测试失败
      return false;
    }
  }

  /**
   * 运行完整测试流程
   */
  async run() {
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║       完整播客生成流程集成测试                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    log(`Worker URL: ${BASE_URL}`, 'info');
    log(`测试风格: ${this.options.style}`, 'info');
    log(`超时时间: ${this.options.timeout}秒`, 'info');
    log(`开始时间: ${new Date().toLocaleString('zh-CN')}\n`, 'info');
    
    const steps = [
      { name: '播客生成', fn: () => this.testPodcastGeneration() },
      { name: '音频轮询', fn: () => this.testAudioPolling() },
      { name: '音频验证', fn: () => this.testAudioVerification() },
      { name: '数据库检查', fn: () => this.testDatabaseCheck() },
      { name: 'RSS Feed检查', fn: () => this.testRssFeedCheck() }
    ];
    
    let currentStep = 0;
    
    try {
      for (let i = 0; i < steps.length; i++) {
        currentStep = i + 1;
        const step = steps[i];
        
        console.log(`\n${'='.repeat(60)}`);
        console.log(`步骤 ${currentStep}/${steps.length}: ${step.name}`);
        console.log('='.repeat(60));
        
        await step.fn();
        
        // 步骤间延迟
        if (i < steps.length - 1) {
          await sleep(1000);
        }
      }
      
      // 所有测试通过
      this.printSummary(true);
      return true;
      
    } catch (error) {
      log(`测试在步骤 ${currentStep} 失败: ${error.message}`, 'error');
      
      if (this.options.verbose) {
        console.error('\n详细错误信息:');
        console.error(error.stack);
      }
      
      this.printSummary(false);
      return false;
    }
  }

  /**
   * 打印测试摘要
   */
  printSummary(success) {
    const totalDuration = Date.now() - this.startTime;
    
    console.log('\n\n╔═══════════════════════════════════════════════════════════╗');
    console.log('║                   测试结果摘要                          ║');
    console.log('╚═══════════════════════════════════════════════════════════╝\n');
    
    const testResults = [
      { name: '播客生成', result: this.results.generation },
      { name: '音频轮询', result: this.results.polling },
      { name: '音频验证', result: this.results.audioVerification },
      { name: '数据库检查', result: this.results.databaseCheck },
      { name: 'RSS Feed检查', result: this.results.rssFeedCheck }
    ];
    
    let passed = 0;
    let failed = 0;
    let skipped = 0;
    
    testResults.forEach(({ name, result }) => {
      if (!result) {
        console.log(`⏭️  ${name}: 未执行`);
        skipped++;
      } else if (result.skipped) {
        console.log(`⏭️  ${name}: 已跳过`);
        skipped++;
      } else if (result.success) {
        console.log(`✅ ${name}: 通过`);
        passed++;
      } else {
        console.log(`❌ ${name}: 失败`);
        if (result.error) {
          console.log(`   错误: ${result.error}`);
        }
        failed++;
      }
    });
    
    console.log('\n' + '─'.repeat(60));
    console.log(`总耗时: ${(totalDuration / 1000).toFixed(2)}秒`);
    console.log(`通过: ${passed} ✅`);
    console.log(`失败: ${failed} ❌`);
    console.log(`跳过: ${skipped} ⏭️`);
    
    if (this.episodeId) {
      console.log('\n生成的剧集信息:');
      console.log(`  Episode ID: ${this.episodeId}`);
      console.log(`  详情链接: ${BASE_URL}/episodes/${this.episodeId}`);
      
      if (this.results.polling?.audioUrl) {
        console.log(`  音频链接: ${this.results.polling.audioUrl}`);
      }
    }
    
    console.log('\n' + '='.repeat(60));
    
    if (success && failed === 0) {
      console.log('🎉 所有测试通过！播客生成流程运行正常。');
    } else if (failed > 0) {
      console.log('⚠️  有测试失败，请查看上述错误信息。');
    } else {
      console.log('⚠️  测试未完全完成。');
    }
    
    console.log('='.repeat(60) + '\n');
  }
}

// 主函数
async function main() {
  const test = new PodcastGenerationTest(options);
  
  try {
    const success = await test.run();
    process.exit(success ? 0 : 1);
  } catch (error) {
    console.error('\n❌ 测试执行失败:', error.message);
    if (options.verbose) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// 执行测试
main();
