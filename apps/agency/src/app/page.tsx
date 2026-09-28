import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { HomeClient } from "./home-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** Server gate — unauthenticated visitors never get the dashboard shell. */
export default async function HomePage() {
  if (!(await isAuthenticated())) {
    redirect("/login");
  }
  return <HomeClient />;
}
