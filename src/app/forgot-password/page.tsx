import { AuthShell } from "@/components/AuthShell";
import { ForgotForm } from "./ForgotForm";

// Forgot your password (S2-36). Public: the person can't sign in yet.
export default function ForgotPasswordPage() {
  return (
    <AuthShell
      icon="mail"
      heading="Locked out? It happens."
      blurb="We'll email you a link to choose a new password. Your requests and replies are all still there."
    >
      <ForgotForm />
    </AuthShell>
  );
}
