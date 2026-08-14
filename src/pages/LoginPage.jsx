import { loginUser } from "../services/authApi";
import { LoginTemplate } from "../components/LoginTemplate.tsx";

export default function LoginPage({ onLogin }) {
  const submit = async ({ username, password }) => {
    const authenticatedSession = await loginUser(username.trim(), password);
    onLogin(authenticatedSession);
  };

  return (
    <LoginTemplate
      logoSrc="/DRUMS_logo.png"
      logoAlt="DRUMS"
      defaultUsername="admin"
      onSubmit={submit}
    />
  );
}
