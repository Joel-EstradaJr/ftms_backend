// app/(staff)/staff/page.tsx
import { redirect } from "next/navigation";

export default function StaffHome() {
  redirect("/staff/dashboard");
}