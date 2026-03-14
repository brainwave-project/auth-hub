/** Read-only config exposed by GET /config (secrets masked). */
export interface ConfigPublicResponse {
  serviceName: string;
  environment: string;
  port: number;
  grpcPort?: number;
  keycloak?: {
    baseUrl: string;
    realm: string;
    clientId: string;
    clientSecretConfigured: boolean;
    redirectBaseUrl?: string;
  };
}
