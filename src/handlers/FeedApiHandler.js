/**
 * Feed API处理器 - 处理RSS和Feed相关的API请求
 */

import { Logger } from '../utils/logger.js';

export class FeedApiHandler {
  constructor() {
    this.logger = new Logger('FeedApiHandler');
  }

  /**
   * 处理RSS Feed请求
   */
  async handleRssFeed(request, services) {
    try {
      this.logger.info('Generating RSS feed');

      const rssXml = await this._generateRssXml(services);

      return new Response(rssXml, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'max-age=300',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      this.logger.error('RSS feed generation failed', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }

  /**
   * 生成RSS XML
   * @private
   */
  async _generateRssXml(services) {
    const episodes = await services.database.getPublishedEpisodes(20, 0);

    const rssItems = episodes.map(ep => {
      const audioUrl = ep.audio_url || '';
      const pubDate = new Date(ep.published_at || ep.created_at).toUTCString();

      return `
    <item>
      <title><![CDATA[${ep.title}]]></title>
      <description><![CDATA[${ep.description}]]></description>
      <link>https://podcast-rss-demo.tj15982183241.workers.dev/episodes/${ep.id}</link>
      <guid>https://podcast-rss-demo.tj15982183241.workers.dev/episodes/${ep.id}</guid>
      <pubDate>${pubDate}</pubDate>
      ${audioUrl ? `<enclosure url="${audioUrl}" type="audio/mpeg" length="${ep.file_size || 0}"/>` : ''}
      <itunes:duration>${Math.floor((ep.duration || 0) / 60)}:${((ep.duration || 0) % 60).toString().padStart(2, '0')}</itunes:duration>
    </item>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd">
  <channel>
    <title>AI新闻播客</title>
    <description>由AI生成的每日新闻播客</description>
    <link>https://podcast-rss-demo.tj15982183241.workers.dev</link>
    <language>zh-cn</language>
    <itunes:author>AI播客生成器</itunes:author>
    <itunes:image href="https://pub-b436254f85684e9e95bebad4567b11ff.r2.dev/public/1.png"/>
    ${rssItems}
  </channel>
</rss>`;
  }

  /**
   * 处理OPML导出（如果需要）
   */
  async handleOpmlExport(request, services) {
    try {
      this.logger.info('Generating OPML export');

      const opmlXml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="1.0">
  <head>
    <title>AI新闻播客订阅</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
    <outline
      type="rss"
      text="AI新闻播客"
      title="AI新闻播客"
      xmlUrl="https://podcast-rss-demo.tj15982183241.workers.dev/rss.xml"
      htmlUrl="https://podcast-rss-demo.tj15982183241.workers.dev"/>
  </body>
</opml>`;

      return new Response(opmlXml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'max-age=3600',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      this.logger.error('OPML export failed', error);
      return new Response('Internal Server Error', { status: 500 });
    }
  }
}
