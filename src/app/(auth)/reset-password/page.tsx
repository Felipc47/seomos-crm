import { ResetPasswordForm } from "@/components/auth/reset-password-form";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export default async function ResetPasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = first(params.token);
  const error = first(params.error);
  return (
    <ResetPasswordForm
      token={token}
      initiallyInvalid={error === "INVALID_TOKEN" || !token}
    />
  );
}
