import { redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import ReviewsClient from "./reviews-client";

export default async function ReviewsPage() {
  if (!(await isAuthenticated())) redirect("/dashboard/login");
  return <ReviewsClient />;
}
