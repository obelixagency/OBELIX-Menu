import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { ChangePasswordCard } from "@/components/dashboard/change-password-card";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  return (
    <div className="space-y-6">
      <SettingsClient />
      <ChangePasswordCard />
    </div>
  );
}
