"use client";

import { useRouter } from "next/navigation";
import { withBasePath } from "@/lib/base-path";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={async () => {
        await fetch(withBasePath("/api/auth/logout"), { method: "POST" });
        router.push("/dashboard/login");
        router.refresh();
      }}
    >
      خروج
    </Button>
  );
}
