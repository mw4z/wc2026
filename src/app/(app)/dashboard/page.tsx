import { redirect } from "next/navigation";

// Dashboard is an alias to the matches hub for the MVP.
export default function Dashboard() {
  redirect("/matches");
}
