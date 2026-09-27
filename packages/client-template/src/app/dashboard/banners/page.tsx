import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import BannersClient from "./banners-client";

export default async function BannersPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  return <BannersClient />;
}
