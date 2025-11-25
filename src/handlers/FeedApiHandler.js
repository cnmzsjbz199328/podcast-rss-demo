/**
 * Feed API处理器 - 处理RSS和Feed相关的API请求
 */

import { Logger } from '../utils/logger.js';
import { ensureCors } from '../utils/http.js';

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

      return ensureCors(new Response(rssXml, {
        headers: {
          'Content-Type': 'application/rss+xml; charset=utf-8',
          'Cache-Control': 'max-age=300'
        }
      }));

    } catch (error) {
      this.logger.error('RSS feed generation failed', error);
      return ensureCors(new Response('Internal Server Error', { status: 500 }));
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
      const srtUrl = ep.srt_url || '';
      const vttUrl = ep.vtt_url || '';
      const jsonUrl = ep.json_url || '';
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
      ${srtUrl ? `<podcast:transcript url="${srtUrl}" type="application/x-subrip" language="en" />` : ''}
      ${vttUrl ? `<podcast:transcript url="${vttUrl}" type="text/vtt" language="en" />` : ''}
      ${jsonUrl ? `<podcast:transcript url="${jsonUrl}" type="application/json" language="en" />` : ''}
    </item>`;
    }).join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:podcast="https://podcastindex.org/namespace/1.0">
    <channel>
    <title>TomNewsPodcast</title>
    <description>由AI生成的每日NewsPodcast</description>
    <link>https://podcast-rss-demo.tj15982183241.workers.dev</link>
    <language>en-us</language>
    <itunes:author>Jiang Tang</itunes:author>
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
    <title>TomNewsPodcast订阅</title>
    <dateCreated>${new Date().toISOString()}</dateCreated>
  </head>
  <body>
    <outline
      type="rss"
      text="TomNewsPodcast"
      title="TomNewsPodcast"
      xmlUrl="https://podcast-rss-demo.tj15982183241.workers.dev/rss.xml"
      htmlUrl="https://podcast-rss-demo.tj15982183241.workers.dev"/>
  </body>
</opml>`;

      return ensureCors(new Response(opmlXml, {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'max-age=3600'
        }
      }));

    } catch (error) {
      this.logger.error('OPML export failed', error);
      return ensureCors(new Response('Internal Server Error', { status: 500 }));
    }
  }
}
