import { loginUser } from "../services/authApi";
import { LoginTemplate } from "../components/LoginTemplate.tsx";

export default function LoginPage({ onLogin, setupRequired = false }) {
  const setupWarning = setupRequired ? (
    <div className="rounded-[12px] border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
      Use the default admin account `admin` / `admin123`, or set
      `INITIAL_ADMIN_PASSWORD` before the first backend start.
    </div>
  ) : null;

  const submit = async ({ username, password }) => {
    const authenticatedSession = await loginUser(username.trim(), password);
    onLogin(authenticatedSession);
  };

  return (
    <LoginTemplate
      logoSrc="/DRUMS_logo.png"
      logoAlt="DRUMS"
      defaultUsername="admin"
      footerContent={setupWarning}
      onSubmit={submit}
    />
  );
}
