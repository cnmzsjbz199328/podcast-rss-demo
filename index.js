// Podcast RSS Feed Generator
// This script generates an RSS feed for a podcast with audio files and subtitles hosted on Cloudflare R2

const fs = require('fs');

// Configuration
const config = {
  title: 'My Podcast Demo',
  description: 'A minimal podcast implementation demo',
  link: 'https://your-domain.com',
  language: 'zh-CN',
  author: 'Podcast Author',
  email: 'podcast@example.com',
  category: 'Technology',
  imageUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com/podcast-cover.jpg',
  baseUrl: 'https://your-r2-bucket.r2.cloudflarestorage.com'
};

// Sample podcast episodes with audio and subtitle files
const episodes = [
  {
    title: 'Episode 1: Introduction to Podcasting',
    description: 'This is the first episode where we introduce podcast basics.',
    pubDate: new Date('2024-01-15').toUTCString(),
    audioUrl: `${config.baseUrl}/audio/episode-001.mp3`,
    audioLength: 15234567, // bytes
    duration: '25:30',
    subtitleUrl: `${config.baseUrl}/subtitles/episode-001.vtt`,
    guid: 'episode-001'
  },
  {
    title: 'Episode 2: Advanced Podcast Techniques',
    description: 'In this episode, we explore advanced podcasting strategies.',
    pubDate: new Date('2024-01-22').toUTCString(),
    audioUrl: `${config.baseUrl}/audio/episode-002.mp3`,
    audioLength: 18456789, // bytes
    duration: '32:45',
    subtitleUrl: `${config.baseUrl}/subtitles/episode-002.vtt`,
    guid: 'episode-002'
  }
];

// Generate RSS Feed
function generateRSSFeed() {
  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" 
     xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${config.title}</title>
    <link>${config.link}</link>
    <description>${config.description}</description>
    <language>${config.language}</language>
    <itunes:author>${config.author}</itunes:author>
    <itunes:email>${config.email}</itunes:email>
    <itunes:category text="${config.category}"/>
    <itunes:image href="${config.imageUrl}"/>
`;

  episodes.forEach(episode => {
    rss += `    <item>
      <title>${episode.title}</title>
      <description>${episode.description}</description>
      <pubDate>${episode.pubDate}</pubDate>
      <guid isPermaLink="false">${episode.guid}</guid>
      <enclosure url="${episode.audioUrl}" length="${episode.audioLength}" type="audio/mpeg"/>
      <itunes:duration>${episode.duration}</itunes:duration>
      <itunes:subtitle>${episode.description}</itunes:subtitle>
      <content:encoded><![CDATA[
        <p>${episode.description}</p>
        <p><a href="${episode.subtitleUrl}">Download Subtitles (VTT)</a></p>
      ]]></content:encoded>
    </item>
`;
  });

  rss += `  </channel>
</rss>`;

  return rss;
}

// Save RSS to file
const rssContent = generateRSSFeed();
fs.writeFileSync('rss.xml', rssContent, 'utf8');

console.log('RSS feed generated successfully!');
console.log('\nRSS Feed Preview:');
console.log(rssContent);

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateRSSFeed, config, episodes };
}