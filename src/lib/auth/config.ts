export const DEFAULT_JWT_SECRET = "change-this-secret-in-production";

interface AuthEnvironment {
  JWT_SECRET?: string;
  NODE_ENV?: string;
  DISABLE_AUTH?: string;
}

export function authenticationIsDisabled(environment: AuthEnvironment = process.env): boolean {
  return environment.DISABLE_AUTH === "true";
}

export function getJwtSecret(environment: AuthEnvironment = process.env): string {
  const configuredSecret = environment.JWT_SECRET?.trim();

  if (!configuredSecret || configuredSecret === DEFAULT_JWT_SECRET || configuredSecret.length < 32) {
    if (environment.NODE_ENV === "production" && !authenticationIsDisabled(environment)) {
      throw new Error(
        "JWT_SECRET must be set to a non-default value of at least 32 characters before starting CDMS in production."
      );
    }
    return DEFAULT_JWT_SECRET;
  }

  return configuredSecret;
}

export function assertProductionAuthConfiguration(): void {
  void getJwtSecret();
}
