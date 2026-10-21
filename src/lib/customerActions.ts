"use server";

import { redirect } from "next/navigation";
import { signUpCustomer, verifyCustomerCredentials } from "@/lib/customers";
import { createCustomerSession, clearCustomerSession } from "@/lib/customerSession";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type RegisterFormState = { error?: string };

export async function registerCustomer(
  _prevState: RegisterFormState,
  formData: FormData,
): Promise<RegisterFormState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const passwordConfirm = String(formData.get("passwordConfirm") ?? "");

  if (name.length < 2) {
    return { error: "Bitte gib deinen Namen an." };
  }
  if (!EMAIL_RE.test(email)) {
    return { error: "Bitte gib eine gültige E-Mail-Adresse an." };
  }
  if (password.length < 8) {
    return { error: "Das Passwort muss mindestens 8 Zeichen lang sein." };
  }
  if (password !== passwordConfirm) {
    return { error: "Die Passwörter stimmen nicht überein." };
  }

  const result = await signUpCustomer({ name, email, phone, password });
  if (!result.ok) {
    return { error: result.error };
  }

  await createCustomerSession(result.customer.id);
  redirect("/konto");
}

export type CustomerLoginFormState = { error?: string };

export async function loginCustomer(
  _prevState: CustomerLoginFormState,
  formData: FormData,
): Promise<CustomerLoginFormState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  const result = await verifyCustomerCredentials(email, password);
  if (!result.ok) {
    return { error: result.error };
  }

  await createCustomerSession(result.customer.id);
  redirect("/konto");
}

export async function logoutCustomer(): Promise<void> {
  await clearCustomerSession();
  redirect("/konto/login");
}
