import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import SettingsClient from "./settings-client";

export default async function SettingsPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  return <SettingsClient />;
}
