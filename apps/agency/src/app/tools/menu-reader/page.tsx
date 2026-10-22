import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import MenuReaderClient from "./menu-reader-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MenuReaderPage() {
  if (!(await isAuthenticated())) redirect("/login");
  return <MenuReaderClient geminiReady={Boolean(process.env.GEMINI_API_KEY)} />;
}
