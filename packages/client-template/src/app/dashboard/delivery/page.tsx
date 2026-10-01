import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import DeliveryClient from "./delivery-client";

export default async function DeliveryPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  return <DeliveryClient />;
}
