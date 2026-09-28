import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import ClientDetailView from "./client-detail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ClientDetailPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  return <ClientDetailView />;
}
