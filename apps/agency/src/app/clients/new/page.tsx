import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import NewClientForm from "./new-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function NewClientPage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  return <NewClientForm />;
}
