import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../../src/app.js';
import { routes } from '../../src/docs/openapi.js';

// Lists every route registered in the app's routers as 'method /path', e.g. 'get /today'
function expressRoutes(app: ReturnType<typeof createApp>) {
  const found: string[] = [];
  // Express 5 does not keep the mount path of a router in a readable form, so we
  // collect the paths inside each router and match them against the end of the documented paths
  for (const layer of app.router.stack) {
    const nested = layer.handle as { stack?: typeof app.router.stack };
    if (!nested.stack) continue;
    for (const inner of nested.stack) {
      if (!inner.route) continue;
      for (const method of Object.keys((inner.route as unknown as { methods: object }).methods)) {
        found.push(`${method} ${inner.route.path}`);
      }
    }
  }
  return found;
}

describe('API documentation', () => {
  it('serves the OpenAPI document and the Swagger UI', async () => {
    const app = createApp();

    const spec = await request(app).get('/api/docs/openapi.json');
    expect(spec.status).toBe(200);
    expect(spec.body.openapi).toBe('3.1.0');
    expect(spec.body.paths['/quests/{id}/complete'].post.responses).toHaveProperty('404');

    const ui = await request(app).get('/api/docs/');
    expect(ui.status).toBe(200);
    expect(ui.text).toContain('swagger-ui');
  });

  it('documents every route of the API', () => {
    const documented = routes.map(
      (route) => `${route.method} ${route.path.replace(/\{(\w+)\}/g, ':$1')}`,
    );
    // Each router route path must be the end of a documented path with the same method
    for (const route of expressRoutes(createApp())) {
      const [method, path] = route.split(' ') as [string, string];
      const match = documented.some((doc) => {
        const [docMethod, docPath] = doc.split(' ') as [string, string];
        return docMethod === method && (docPath.endsWith(path) || path === '/');
      });
      expect(match, `${route} is not documented`).toBe(true);
    }
    // Same number of routes on both sides: nothing documented that does not exist
    expect(documented).toHaveLength(expressRoutes(createApp()).length);
  });
});
