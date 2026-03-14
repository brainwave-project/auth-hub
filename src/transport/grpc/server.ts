import * as grpc from "@grpc/grpc-js";
import * as path from "path";
import { loadSync } from "@grpc/proto-loader";
import type { EnvConfig } from "../../config/env.js";
import { validateToken } from "../../services/token-validation.service.js";
import type { IdentityError } from "../../errors/identity.errors.js";

const PROTO_PATH = path.resolve(process.cwd(), "authhub.proto");

const packageDefinition = loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const pkg = grpc.loadPackageDefinition(packageDefinition) as Record<
  string,
  Record<string, { service: grpc.ServiceDefinition }>
>;
const service = pkg?.authhub?.TokenValidation?.service;

export interface GrpcServerOptions {
  config: EnvConfig;
  port?: number;
}

/**
 * Starts the gRPC server for TokenValidation (ValidateToken RPC).
 * Other microservices call this to validate access tokens.
 */
export function startGrpcServer(options: GrpcServerOptions): grpc.Server {
  const { config, port = 50051 } = options;
  const server = new grpc.Server();

  const validateTokenHandler = async (
    call: grpc.ServerUnaryCall<
      { token: string; required_roles?: string[] },
      {
        valid: boolean;
        sub: string;
        roles: string[];
        exp: number;
        iat: number;
        realm: string;
        error_code: string;
        error_message: string;
      }
    >,
    callback: grpc.sendUnaryData<{
      valid: boolean;
      sub: string;
      roles: string[];
      exp: number;
      iat: number;
      realm: string;
      error_code: string;
      error_message: string;
    }>
  ) => {
    const request = call.request as { token?: string; required_roles?: string[] };
    const token = request.token ?? "";
    const requiredRoles = request.required_roles ?? [];

    try {
      const result = await validateToken(config, { token, requiredRoles });
      const { identity } = result;
      callback(null, {
        valid: true,
        sub: identity.sub,
        roles: identity.roles,
        exp: identity.exp,
        iat: identity.iat ?? 0,
        realm: identity.realm ?? "",
        error_code: "",
        error_message: "",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const errorCode = err && typeof (err as IdentityError).code === "string" ? (err as IdentityError).code : "UNKNOWN";
      callback(null, {
        valid: false,
        sub: "",
        roles: [],
        exp: 0,
        iat: 0,
        realm: "",
        error_code: errorCode,
        error_message: message,
      });
    }
  };

  const serviceImpl = {
    ValidateToken: validateTokenHandler,
  };

  if (!service) {
    throw new Error("Proto definition not found: authhub.TokenValidation. Ensure authhub.proto is at project root.");
  }
  server.addService(service, serviceImpl);

  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    (err, boundPort) => {
      if (err) {
        console.error("gRPC server bind failed", err);
        return;
      }
      console.log(`AuthHub gRPC server listening on 0.0.0.0:${boundPort}`);
    }
  );

  return server;
}
