/**
 * 测试处理器 - 用于调试和单点测试
 */

import { Logger } from '../utils/logger.js';

export class TestHandler {
  constructor() {
    this.logger = new Logger('TestHandler');
  }

  /**
   * 测试 IndexTTS 直接调用
   * 使用固定文本，绕过News和脚本生成
   */
  async handleTestTts(request, services) {
    this.logger.info('Testing IndexTTS direct call');

    try {
      // 固定测试文本（与 test-simple-tts.js 相同）
      const testScript = '剑桥郡火车刺伤案中，一名列车工作人员生命垂危。然而，警方赞扬司机、乘务员及乘客英勇施救，避免了更严重后果。与此同时，一名因贩毒被捕的英国19岁怀孕少女，在格鲁吉亚监狱获释，她已怀孕八个月。这两起事件都提醒我们，在挑战面前，总有生命韧性与人道光辉闪耀。';
      
      const style = new URL(request.url).searchParams.get('style') || 'guo-de-gang';

      this.logger.info('Calling IndexTTS with test script', {
        style,
        scriptLength: testScript.length
      });

      // 直接调用 voiceService（会同步等待音频生成）
      const voiceResult = await services.voiceService.generateAudio(testScript, style);

      this.logger.info('IndexTTS call completed', {
        audioSize: voiceResult.fileSize,
        duration: voiceResult.duration
      });

      // 上传音频到 R2
      const audioKey = `test-audio/${new Date().toISOString().split('T')[0]}-${style}-${Math.random().toString(36).substring(7)}.wav`;
      
      await services.storageService.bucket.put(audioKey, voiceResult.audioData, {
        httpMetadata: {
          contentType: 'audio/wav',
          cacheControl: 'public, max-age=31536000',
        },
        customMetadata: {
          type: 'test-audio',
          style: style,
          uploadedAt: new Date().toISOString()
        }
      });

      const audioUrl = `${services.storageService.baseUrl}/${audioKey}`;

      // 保存到数据库
      const episodeId = `test-${style}-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      
      await services.database.saveEpisode({
        id: episodeId,
        title: `IndexTTS 测试 - ${style}`,
        description: '这是一个 IndexTTS 单点测试',
        audioUrl: audioUrl,
        audioKey: audioKey,
        style: style,
        duration: voiceResult.duration || 0,
        fileSize: voiceResult.fileSize,
        transcript: testScript,
        ttsStatus: 'completed',
        metadata: {
          test: true,
          ...voiceResult.metadata
        }
      });

      this.logger.info('Test episode created', { episodeId });

      return new Response(JSON.stringify({
        success: true,
        test: true,
        data: {
          episodeId,
          audioUrl,
          audioSize: voiceResult.fileSize,
          duration: voiceResult.duration,
          style,
          testScript: testScript.substring(0, 100) + '...',
          metadata: voiceResult.metadata,
          message: '音频已同步生成并上传到 R2'
        }
      }, null, 2), {
        headers: { 'Content-Type': 'application/json' }
      });

    } catch (error) {
      this.logger.error('Test TTS failed', error);
      
      return new Response(JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

    /**
     * 测试 RSS 获取
     */
    async handleTestRss(request, services) {
      this.logger.info('Testing RSS fetch');

      try {
        const items = await services.rssService.fetchNews({ maxItems: 5 });
        return new Response(JSON.stringify({ success: true, count: items.length, items }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        this.logger.error('Test RSS failed', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
    }

    /**
     * 测试脚本生成（从 RSS 获取并生成脚本）
     */
    async handleTestScript(request, services) {
      this.logger.info('Testing script generation');

      try {
        const style = new URL(request.url).searchParams.get('style') || 'news-anchor';
        const news = await services.rssService.fetchNews({ maxItems: 3 });

        if (!news || news.length === 0) {
          throw new Error('No news items fetched');
        }

        const scriptResult = await services.scriptService.generateScript(news, style);

        return new Response(JSON.stringify({ success: true, style, script: scriptResult }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });

      } catch (error) {
        this.logger.error('Test script failed', error);
        return new Response(JSON.stringify({ success: false, error: error.message }), { status: 500 });
      }
    }
}
