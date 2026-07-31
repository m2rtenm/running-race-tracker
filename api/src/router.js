export class Router {
  constructor() {
    this.middlewares = [];
    this.routes = [];
  }

  use(handler) {
    if (typeof handler === 'object' && handler.routes) {
      this.routes.push(handler);
    } else if (typeof handler === 'function') {
      this.middlewares.push(handler);
    }
  }

  get(path, handler) {
    this.routes.push({ method: 'GET', path, handler });
  }

  post(path, handler) {
    this.routes.push({ method: 'POST', path, handler });
  }

  put(path, handler) {
    this.routes.push({ method: 'PUT', path, handler });
  }

  delete(path, handler) {
    this.routes.push({ method: 'DELETE', path, handler });
  }

  async handle(event) {
    const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
    const path = event.rawPath || event.path || '';

    if (method === 'OPTIONS') {
      return this._corsResponse(200, {});
    }

    // Create request object
    const request = {
      method,
      path,
      headers: event.headers || {},
      queryStringParameters: event.queryStringParameters || {},
      body: event.body ? JSON.parse(event.body) : {},
      userId: event.userId,
    };

    // Apply middlewares
    for (const middleware of this.middlewares) {
      await middleware(request, event);
    }

    // Find matching route
    for (const route of this.routes) {
      if (route.routes) {
        const match = this._matchRoute(route, path, method);
        if (match) {
          const params = match.params || {};
          return await this._callHandler(match.handler, { ...request, params }, event);
        }
      } else if (route.method === method && this._pathMatch(route.path, path)) {
        const params = this._extractParams(route.path, path);
        return await this._callHandler(route.handler, { ...request, params }, event);
      }
    }

    return this._corsResponse(404, { error: 'Not found' });
  }

  _matchRoute(router, path, method) {
    for (const route of router.routes || []) {
      if (route.method === method && this._pathMatch(route.path, path)) {
        const params = this._extractParams(route.path, path);
        return { handler: route.handler, params };
      }
    }
    return null;
  }

  _pathMatch(routePath, requestPath) {
    const routeParts = routePath.split('/').filter(Boolean);
    const requestParts = requestPath.split('/').filter(Boolean);

    if (routeParts.length !== requestParts.length) return false;

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) continue;
      if (routeParts[i] !== requestParts[i]) return false;
    }

    return true;
  }

  _extractParams(routePath, requestPath) {
    const routeParts = routePath.split('/').filter(Boolean);
    const requestParts = requestPath.split('/').filter(Boolean);
    const params = {};

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        const paramName = routeParts[i].slice(1);
        params[paramName] = requestParts[i];
      }
    }

    return params;
  }

  async _callHandler(handler, request, event) {
    try {
      const response = await handler(request);
      return this._corsResponse(response.statusCode || 200, response.body || response);
    } catch (error) {
      console.error('Handler error:', error);
      return this._corsResponse(500, { error: error.message });
    }
  }

  _corsResponse(statusCode, body) {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
      },
      body: JSON.stringify(body),
    };
  }
}
