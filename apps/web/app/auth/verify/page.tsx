"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Link from "next/link";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No token provided in the URL query parameter link.");
      return;
    }

    const triggerVerification = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
        
        const res = await fetch(`${apiUrl}/auth/verify-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        // 1. Defend against non-JSON text vectors (Prevents Unexpected token '<' errors)
        const contentType = res.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const plainText = await res.text();
          console.error("Non-JSON Server response intercepted:", plainText);
          throw new Error("The API Gateway returned an invalid response page instead of system parameters.");
        }

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Verification mapping check failed.");
        }

        setStatus("success");
        
        setTimeout(() => {
          router.push("/auth/sign-in");
        }, 2500);

      } catch (err: unknown) {
        console.error("Verification screen execution catch block:", err);
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "An issue occurred connecting to the identity validation gateways.");
      }
    };

    triggerVerification();
  }, [token, router]);

  return (
    <Card className="w-full max-w-md mx-auto border-0 bg-transparent shadow-none">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold tracking-tight">Account Activation</CardTitle>
        <CardDescription>Finalizing real-time microservice security records</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center py-6 space-y-4">
        
        {status === "verifying" && (
          <div className="flex flex-col items-center space-y-3">
            <Spinner className="h-8 w-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground animate-pulse">Syncing domain mapping rules with tenant scopes...</p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
            <h3 className="text-lg font-medium text-foreground">Verification Complete!</h3>
            <p className="text-sm text-muted-foreground">User account moved to active directory. Opening Sign In...</p>
          </div>
        )}

        {status === "error" && (
          <div className="w-full space-y-4">
            <Alert variant="destructive" className="border-destructive/40 bg-destructive/5 text-destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Activation Error</AlertTitle>
              <AlertDescription className="text-xs mt-1 leading-relaxed">
                {errorMessage}
              </AlertDescription>
            </Alert>
            <div className="text-center">
              <Link href="/auth/sign-up" className="text-sm font-medium text-primary hover:underline">
                Return to Account Registration
              </Link>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="flex items-center justify-center">
      <Suspense fallback={<Spinner className="h-8 w-8 text-primary animate-spin" />}>
        <VerifyEmailContent />
      </Suspense>
    </div>
  );
}