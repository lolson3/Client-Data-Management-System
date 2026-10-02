/**
 * Type guards and validation utilities for Excel data
 */

import type {
  Company,
  CoreInfrastructure,
  User,
  Workstation,
} from "@/types/data";

/**
 * Validate company data
 */
export function isValidCompany(data: any): data is Company {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data["Company Name"] === "string" &&
    typeof data.Abbrv === "string" &&
    typeof data.Status === "number"
  );
}

/**
 * Validate core infrastructure data
 */
export function isValidCoreInfrastructure(
  data: any
): data is CoreInfrastructure {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.Client === "string" &&
    typeof data.Name === "string"
  );
}

/**
 * Validate user data
 */
export function isValidUser(data: any): data is User {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.Client === "string" &&
    typeof data.Name === "string"
  );
}

/**
 * Validate workstation data
 */
export function isValidWorkstation(data: any): data is Workstation {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof data.Client === "string" &&
    typeof data["Computer Name"] === "string"
  );
}

/**
 * Sanitize sensitive fields (replace with masked values)
 */
export function sanitizeSensitiveData<T extends Record<string, any>>(
  data: T,
  sensitiveFields: (keyof T)[] = []
): T {
  const sanitized = { ...data };

  const defaultSensitiveFields = [
    "Password",
    "PW",
    "pass",
    "passwd",
    "Alt Passwd",
    "VPN Password",
  ];

  const fieldsToSanitize = [
    ...defaultSensitiveFields,
    ...sensitiveFields,
  ] as (keyof T)[];

  fieldsToSanitize.forEach((field) => {
    if (field in sanitized && sanitized[field]) {
      sanitized[field] = "●●●●●●" as any;
    }
  });

  // Also sanitize Encrypt PW fields in Acronis data
  Object.keys(sanitized).forEach((key) => {
    if (key.startsWith("Encrypt PW") && sanitized[key as keyof T]) {
      sanitized[key as keyof T] = "●●●●●●" as any;
    }
  });

  return sanitized;
}

/**
 * Sanitize an array of data
 */
export function sanitizeDataArray<T extends Record<string, any>>(
  data: T[],
  sensitiveFields?: (keyof T)[]
): T[] {
  return data.map((item) => sanitizeSensitiveData(item, sensitiveFields));
}

/**
 * Clean empty fields from data (convert empty strings to null)
 */
export function cleanEmptyFields<T extends Record<string, any>>(data: T): T {
  const cleaned = { ...data };

  Object.keys(cleaned).forEach((key) => {
    const value = cleaned[key as keyof T];
    if (value === "" || value === undefined) {
      cleaned[key as keyof T] = null as any;
    }
  });

  return cleaned;
}

/**
 * Merge workstation and user data
 */
export function mergeWorkstationUser(
  workstation: Workstation,
  user?: User
): Workstation & { UserName?: string; UserLogin?: string; UserPhone?: string } {
  if (!user) {
    return workstation;
  }

  return {
    ...workstation,
    UserName: user.Name,
    UserLogin: user.Login,
    UserPhone: user.Phone,
  };
}
