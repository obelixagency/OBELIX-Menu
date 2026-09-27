import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import ContactsClient from "./contacts-client";

export default async function ContactsPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  return <ContactsClient />;
}
