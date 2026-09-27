import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import ProductsClient from "./products-client";

export default async function ProductsPage() {
  if (!(await isAuthenticated())) {
    redirect("/dashboard/login");
  }
  return <ProductsClient />;
}
