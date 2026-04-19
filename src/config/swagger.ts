import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import type { Express } from 'express';

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title:       'AuthHub API',
      version:     '1.0.0',
      description: 'Centralized identity management — Keycloak facade for login, logout, token refresh, and introspection.',
    },
    servers: [{ url: '/api', description: 'AuthHub via Kong' }],
    tags: [
      { name: 'Auth',   description: 'Login, logout, token refresh, and OIDC callback' },
      { name: 'Tokens', description: 'Token validation, introspection, and JWKS' },
    ],
    components: {
      schemas: {
        TokenResponse: {
          type: 'object',
          properties: {
            access_token:  { type: 'string' },
            refresh_token: { type: 'string' },
            expires_in:    { type: 'integer', example: 300 },
            token_type:    { type: 'string', example: 'Bearer' },
          },
        },
        IntrospectResponse: {
          type: 'object',
          properties: {
            active:     { type: 'boolean' },
            sub:        { type: 'string', format: 'uuid' },
            exp:        { type: 'integer', description: 'Unix timestamp' },
            email:      { type: 'string', format: 'email' },
            realm_access: {
              type: 'object',
              properties: { roles: { type: 'array', items: { type: 'string' } } },
            },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            error:   { type: 'string' },
            details: { type: 'string' },
          },
        },
      },
    },
  },
  // Handlers moved to transport/http/handlers/ — point scan here
  apis: ['./src/transport/http/handlers/*.ts', './src/transport/http/router.ts'],
};

const swaggerSpec = swaggerJSDoc(options);

export function setupSwagger(app: Express): void {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));
}
