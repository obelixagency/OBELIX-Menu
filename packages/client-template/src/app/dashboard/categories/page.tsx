import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import CategoriesClient from "./categories-client";

export default async function CategoriesPage() {
  if (!(await isAuthenticated())) {
    redirect("/dashboard/login");
  }
  return <CategoriesClient />;
}
