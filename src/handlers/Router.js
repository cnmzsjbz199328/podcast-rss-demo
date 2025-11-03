/**
 * 路由处理器 - 分离路由逻辑
 */

import { Logger } from '../utils/logger.js';

export class Router {
  constructor() {
    this.logger = new Logger('Router');
    this.routes = new Map();
  }

  /**
   * 注册路由
   * @param {string} method - HTTP方法
   * @param {string} pattern - 路由模式
   * @param {Function} handler - 处理函数
   */
  register(method, pattern, handler) {
    const key = `${method}:${pattern}`;
    this.routes.set(key, handler);
    this.logger.debug('Route registered', { method, pattern });
  }

  /**
   * 匹配路由
   * @param {string} method - HTTP方法
   * @param {string} pathname - 请求路径
   * @returns {Object|null} 匹配结果
   */
  match(method, pathname) {
    for (const [key, handler] of this.routes) {
      const [routeMethod, pattern] = key.split(':');

      if (routeMethod !== method && routeMethod !== 'ALL') {
        continue;
      }

      // 简单模式匹配
      if (pattern.includes('*')) {
        const regex = new RegExp(pattern.replace(/\*/g, '([^/]+)'));
        const match = pathname.match(regex);
        if (match) {
          return { handler, params: match.slice(1) };
        }
      } else if (pathname === pattern) {
        return { handler, params: [] };
      }
    }

    return null;
  }

  /**
   * 处理请求
   * @param {Request} request - 请求对象
   * @param {Object} services - 服务实例
   * @returns {Promise<Response>} 响应
   */
  async handle(request, services) {
    const url = new URL(request.url);
    const method = request.method;

    this.logger.debug('Routing request', { method, pathname: url.pathname });

    const match = this.match(method, url.pathname);

    if (match) {
      try {
        return await match.handler(request, services, match.params);
      } catch (error) {
        this.logger.error('Handler error', error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Internal server error'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // 404 Not Found
    return new Response(JSON.stringify({
      success: false,
      error: 'Not found'
    }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
