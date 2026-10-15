"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isUnauthorizedApiError, requestJson } from "@/lib/client-api";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
      try {
        const config = await requestJson<{ authDisabled?: boolean }>("/api/config");

        if (config.authDisabled) {
          // Auth disabled - go directly to dashboard
          router.push("/dashboard");
          return;
        }

        await requestJson<{ user: Record<string, unknown> }>("/api/auth/me");
        router.push("/dashboard");
      } catch (error) {
        if (!isUnauthorizedApiError(error)) {
          console.error("Failed to check authentication:", error);
        }
        router.push("/login");
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-900">
      <p className="text-gray-700 dark:text-gray-300">Redirecting...</p>
    </div>
  );
}
