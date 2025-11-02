#!/usr/bin/env node

/**
 * 部署配置检查脚本
 */

import { config } from 'dotenv';
config();

console.log('🔍 Cloudflare 部署配置检查\\n');

// 检查 Account ID
console.log('📋 Account ID 检查:');
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
if (accountId && accountId !== 'your_cloudflare_account_id') {
  console.log(`  ✅ 已配置: ${accountId.substring(0, 8)}...`);
} else {
  console.log('  ❌ 未配置或使用占位符');
}

// 检查 API Token
console.log('\\n🔑 API Token 检查:');
const apiToken = process.env.CLOUDFLARE_API_TOKEN;
if (apiToken && apiToken !== 'your_cloudflare_api_token') {
  console.log(`  ✅ 已配置: ${apiToken.substring(0, 10)}... (${apiToken.length} 字符)`);
} else {
  console.log('  ❌ 未配置或使用占位符');
}

// 检查 Gemini API Key
console.log('\\n🤖 Gemini API 检查:');
const geminiKey = process.env.GEMINI_API_KEY;
if (geminiKey && geminiKey !== 'your_gemini_api_key_here') {
  console.log(`  ✅ 已配置: ${geminiKey.substring(0, 10)}... (${geminiKey.length} 字符)`);
} else {
  console.log('  ❌ 未配置或使用占位符');
}

// 检查 wrangler.toml
console.log('\\n📄 wrangler.toml 检查:');
try {
  const fs = await import('fs');
  const wranglerConfig = fs.readFileSync('wrangler.toml', 'utf8');

  if (wranglerConfig.includes('e5bb181bf10eddf30de93f35885a5479')) {
    console.log('  ✅ Account ID 已正确配置');
  } else {
    console.log('  ❌ Account ID 配置不正确');
  }
} catch (error) {
  console.log('  ❌ 无法读取 wrangler.toml 文件');
}

// 建议
console.log('\\n💡 建议:');
if (!accountId || accountId === 'your_cloudflare_account_id') {
  console.log('  - 设置正确的 CLOUDFLARE_ACCOUNT_ID');
}
if (!apiToken || apiToken === 'your_cloudflare_api_token') {
  console.log('  - 设置正确的 CLOUDFLARE_API_TOKEN');
  console.log('  - 或运行: npx wrangler auth login');
}
if (!geminiKey || geminiKey === 'your_gemini_api_key_here') {
  console.log('  - 设置正确的 GEMINI_API_KEY');
}

console.log('\\n🚀 部署命令:');
console.log('  npm run deploy');

console.log('\\n📚 更多帮助:');
console.log('  查看 DEPLOYMENT.md 和 TROUBLESHOOTING.md');
