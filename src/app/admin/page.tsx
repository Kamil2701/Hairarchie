import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/session";
import { LoginForm } from "@/components/admin/LoginForm";

export default async function AdminLoginPage() {
  if (await isAdminAuthenticated()) {
    redirect("/admin/dashboard");
  }

  return (
    <div className="flex min-h-full items-center justify-center bg-paper-2/60 px-5 py-20">
      <div className="w-full max-w-sm rounded-3xl bg-paper p-8 shadow-[0_20px_50px_-20px_var(--shadow)]">
        <p className="font-data text-xs uppercase tracking-[0.2em] text-moss">Team</p>
        <h1 className="mt-2 text-2xl text-ink">Buchungen einsehen</h1>
        <div className="mt-6">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
