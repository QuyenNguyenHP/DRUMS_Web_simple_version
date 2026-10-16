import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import Footer from "../components/Footer";
import Header from "../components/Header";
import NavigationSidebar from "../components/NavigationSidebar";
import { createUser, deleteUser, fetchUsers } from "../services/authApi";

const inputClassName =
  "w-full rounded-[12px] border border-slate-600 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 outline-none transition focus:border-sky-400";
const buttonClassName =
  "rounded-[12px] bg-sky-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-70";

export default function AdminPage({ authToken, user, onLogout }) {
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingUsername, setDeletingUsername] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [formValues, setFormValues] = useState({
    username: "",
    password: "",
    role: "user",
  });

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setError("");

    try {
      const payload = await fetchUsers(authToken);
      setUsers(Array.isArray(payload?.users) ? payload.users : []);
      setLastUpdated(new Date());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load users.");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormValues((currentValues) => ({ ...currentValues, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const payload = await createUser(authToken, {
        username: formValues.username.trim(),
        password: formValues.password,
        role: formValues.role,
      });

      setUsers((currentUsers) => [...currentUsers, payload.user]);
      setFormValues({ username: "", password: "", role: "user" });
      setSuccessMessage(`User ${payload.user.username} created successfully.`);
      setLastUpdated(new Date());
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to create user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (listedUser) => {
    const confirmed = window.confirm(
      `Delete user ${listedUser.username}? This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeletingUsername(listedUser.username);
    setError("");
    setSuccessMessage("");

    try {
      await deleteUser(authToken, listedUser.username);
      setUsers((currentUsers) =>
        currentUsers.filter((currentUser) => currentUser.username !== listedUser.username),
      );
      setSuccessMessage(`User ${listedUser.username} deleted successfully.`);
      setLastUpdated(new Date());
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete user.");
    } finally {
      setDeletingUsername("");
    }
  };

  return (
    <div className="flex min-h-screen w-full flex-col overflow-hidden bg-[#07111f]">
      <Header user={user} onLogout={onLogout} />

      <main className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <NavigationSidebar className="w-full min-w-0 lg:w-56 lg:min-w-56" user={user} />

        <section className="flex-1 min-w-0 p-3 lg:p-5">
          <div className="flex h-full min-h-[420px] flex-col gap-4 rounded-lg border border-slate-700 bg-slate-800/95 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] lg:min-h-[calc(100vh-116px)] lg:p-5">
            <div className="rounded-[14px] border border-slate-700 bg-slate-900/70 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-300">
                    Admin Control
                  </p>
                  <h1 className="mt-2 text-3xl font-bold text-slate-50">
                    User Administration
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm text-slate-300">
                    Create local users and assign either `admin` or `user` role.
                    Only admins can open this page.
                  </p>
                  {user.role === "admin" && (
                    <Link to="/admin/config" className="mt-3 inline-block text-sm font-semibold text-sky-300 hover:text-sky-200">
                      Edit backend configuration
                    </Link>
                  )}
                </div>
                <button
                  type="button"
                  className={buttonClassName}
                  onClick={loadUsers}
                  disabled={isLoadingUsers}
                >
                  {isLoadingUsers ? "Refreshing..." : "Refresh Users"}
                </button>
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
              <section className="rounded-[14px] border border-slate-700 bg-slate-900/70 p-5">
                <h2 className="text-lg font-semibold text-slate-50">Add User</h2>
                <p className="mt-1 text-sm text-slate-400">
                  New accounts are stored in the backend JSON file.
                </p>

                <form className="mt-5 grid gap-4" onSubmit={handleSubmit}>
                  <label className="grid gap-2 text-sm font-medium text-slate-200">
                    Username
                    <input
                      className={inputClassName}
                      name="username"
                      value={formValues.username}
                      onChange={handleChange}
                      placeholder="Enter username"
                      required
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-200">
                    Password
                    <input
                      className={inputClassName}
                      name="password"
                      type="password"
                      value={formValues.password}
                      onChange={handleChange}
                      placeholder="Enter password"
                      required
                    />
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-200">
                    Role
                    <select
                      className={inputClassName}
                      name="role"
                      value={formValues.role}
                      onChange={handleChange}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                    </select>
                  </label>

                  <button type="submit" className={buttonClassName} disabled={isSaving}>
                    {isSaving ? "Creating..." : "Create User"}
                  </button>
                </form>

                {successMessage ? (
                  <div className="mt-4 rounded-[12px] border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                    {successMessage}
                  </div>
                ) : null}

                {error ? (
                  <div className="mt-4 rounded-[12px] border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                ) : null}
              </section>

              <section className="rounded-[14px] border border-slate-700 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-50">Existing Users</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Signed in as {user.username} ({user.role})
                    </p>
                  </div>
                  <div className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                    {users.length} users
                  </div>
                </div>

                <div className="mt-4 overflow-hidden rounded-[12px] border border-slate-700">
                  <table className="min-w-full divide-y divide-slate-700 text-left text-sm text-slate-200">
                    <thead className="bg-slate-950/80 text-xs uppercase tracking-[0.14em] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Username</th>
                        <th className="px-4 py-3">Role</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-900/50">
                      {isLoadingUsers ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-400" colSpan={4}>
                            Loading users...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td className="px-4 py-4 text-slate-400" colSpan={4}>
                            No users found.
                          </td>
                        </tr>
                      ) : (
                        users.map((listedUser) => (
                          <tr key={listedUser.username}>
                            <td className="px-4 py-3 font-medium text-slate-100">
                              {listedUser.username}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full border border-slate-600 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-sky-200">
                                {listedUser.role}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-400">
                              {listedUser.createdAt
                                ? new Date(listedUser.createdAt).toLocaleString()
                                : "--"}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                className="rounded-[10px] border border-rose-500/50 px-3 py-1.5 text-xs font-semibold text-rose-200 transition hover:bg-rose-500/15 disabled:cursor-not-allowed disabled:opacity-50"
                                onClick={() => handleDelete(listedUser)}
                                disabled={
                                  deletingUsername === listedUser.username ||
                                  listedUser.username.toLowerCase() === user.username.toLowerCase()
                                }
                                title={
                                  listedUser.username.toLowerCase() === user.username.toLowerCase()
                                    ? "You cannot delete the account you are signed in with"
                                    : `Delete ${listedUser.username}`
                                }
                              >
                                {deletingUsername === listedUser.username ? "Deleting..." : "Delete"}
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>
        </section>
      </main>

      <Footer lastUpdated={lastUpdated} pollIntervalMs={null} />
    </div>
  );
}
