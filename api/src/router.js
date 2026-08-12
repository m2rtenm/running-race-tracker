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
      return this._corsResponse(200, {}, event.headers?.origin || event.headers?.Origin || null);
    }

    // Create request object
    const request = {
      method,
      path,
      headers: event.headers || {},
      queryStringParameters: event.queryStringParameters || {},
      body: event.body ? JSON.parse(event.body) : {},
      userId: event.userId,
      origin: event.headers?.origin || event.headers?.Origin || null,
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

    return this._corsResponse(404, { error: 'Not found' }, request.origin);
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
      return this._corsResponse(response.statusCode || 200, response.body || response, request.origin);
    } catch (error) {
      console.error('Handler error:', error);
      const statusCode = error?.statusCode || 500;
      const body = error?.body || { error: error.message };
      return this._corsResponse(statusCode, body, request.origin);
    }
  }

  _corsResponse(statusCode, body, origin = null) {
    const allowedOrigins = (process.env.ALLOWED_ORIGINS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "null";

    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': allowOrigin,
        'Vary': 'Origin',
        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
        'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'Access-Control-Allow-Credentials': 'true',
      },
      body: JSON.stringify(body),
    };
  }
}
