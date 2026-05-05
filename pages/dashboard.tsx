import { FormEvent, ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

type Project = {
  id: string;
  name: string;
  description: string;
  owner: { id: string; name: string; email: string };
  members: { id: string; name: string; email: string }[];
};

type Task = {
  id: string;
  title: string;
  description: string;
  status: "TODO" | "IN_PROGRESS" | "DONE";
  dueDate: string | null;
  project: { id: string; name: string };
  assignee: { name: string; email: string } | null;
};

const statuses = ["TODO", "IN_PROGRESS", "DONE"] as const;

const statusLabels: Record<Task["status"], string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

const statusStyles: Record<Task["status"], string> = {
  TODO: "bg-amber-50 text-amber-700 border-amber-200",
  IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-200",
  DONE: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskProjectId, setTaskProjectId] = useState("");
  const [taskAssigneeId, setTaskAssigneeId] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const authHeaders = useMemo(
    () => ({ Authorization: token ? `Bearer ${token}` : "" }),
    [token]
  );

  const loadData = useCallback(async () => {
    if (!token) return;

    const [userRes, projectRes, taskRes] = await Promise.all([
      fetch("/api/users/me", { headers: authHeaders }),
      fetch("/api/projects", { headers: authHeaders }),
      fetch("/api/tasks", { headers: authHeaders }),
    ]);

    if (userRes.status === 401) {
      localStorage.removeItem("ttm_token");
      router.push("/login");
      return;
    }

    const userJson = await userRes.json();
    const projectJson = await projectRes.json();
    const taskJson = await taskRes.json();

    setUser(userJson.user);
    setProjects(projectJson.projects || []);
    setTasks(taskJson.tasks || []);
    setTaskProjectId((current) => current || projectJson.projects?.[0]?.id || "");

    if (userJson.user?.role === "ADMIN") {
      const usersRes = await fetch("/api/users", { headers: authHeaders });
      const usersJson = await usersRes.json();
      setUsers(usersJson.users || []);
    }

    setLoading(false);
  }, [authHeaders, router, token]);

  useEffect(() => {
    const storedToken = localStorage.getItem("ttm_token");

    if (!storedToken) {
      router.push("/login");
      return;
    }

    setToken(storedToken);
  }, [router]);

  useEffect(() => {
    if (!token) return;

    loadData().catch(() => {
      setMessage({ type: "error", text: "Could not load dashboard data." });
      setLoading(false);
    });
  }, [loadData, token]);

  const selectedProject = projects.find((project) => project.id === taskProjectId);
  const assignableUsers = useMemo(() => {
    if (!selectedProject) return [];
    const byId = new Map<string, { id: string; name: string; email: string }>();
    byId.set(selectedProject.owner.id, selectedProject.owner);
    selectedProject.members.forEach((member) => byId.set(member.id, member));
    return Array.from(byId.values());
  }, [selectedProject]);

  const summary = useMemo(() => {
    const now = new Date();
    return {
      total: tasks.length,
      todo: tasks.filter((task) => task.status === "TODO").length,
      inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      done: tasks.filter((task) => task.status === "DONE").length,
      overdue: tasks.filter((task) => task.status !== "DONE" && task.dueDate && new Date(task.dueDate) < now).length,
    };
  }, [tasks]);

  function toggleMember(userId: string) {
    setSelectedMemberIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const selectedEmails = users
      .filter((teamUser) => selectedMemberIds.includes(teamUser.id))
      .map((teamUser) => teamUser.email);

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ name: projectName, description: projectDescription, members: selectedEmails }),
    });
    const payload = await res.json();

    if (!res.ok) {
      setMessage({ type: "error", text: payload.message || "Project creation failed." });
      return;
    }

    setProjectName("");
    setProjectDescription("");
    setSelectedMemberIds([]);
    setProjects((current) => [payload.project, ...current]);
    setTaskProjectId((current) => current || payload.project.id);
    setMessage({ type: "success", text: "Project created." });
  }

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({
        title: taskTitle,
        description: taskDescription,
        projectId: taskProjectId,
        assigneeId: taskAssigneeId || undefined,
        dueDate: taskDueDate || undefined,
      }),
    });
    const payload = await res.json();

    if (!res.ok) {
      setMessage({ type: "error", text: payload.message || "Task creation failed." });
      return;
    }

    setTaskTitle("");
    setTaskDescription("");
    setTaskDueDate("");
    setTaskAssigneeId("");
    setTasks((current) => [payload.task, ...current]);
    setMessage({ type: "success", text: "Task created." });
  }

  async function updateTaskStatus(taskId: string, status: Task["status"]) {
    setMessage(null);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...authHeaders },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json();

    if (!res.ok) {
      setMessage({ type: "error", text: payload.message || "Could not update task." });
      return;
    }

    setTasks((current) => current.map((task) => (task.id === taskId ? payload.task : task)));
  }

  function logout() {
    localStorage.removeItem("ttm_token");
    router.push("/login");
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-100 p-8 text-slate-700">Loading dashboard...</main>;
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Team Task Manager</h1>
            <p className="text-sm text-slate-500">Signed in as {user?.name} ({user?.role})</p>
          </div>
          <button onClick={logout} className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
            Logout
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {message && (
          <div className={`mb-5 rounded-md border px-4 py-3 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
            {message.text}
          </div>
        )}

        <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
          <Stat label="Total tasks" value={summary.total} />
          <Stat label="To do" value={summary.todo} />
          <Stat label="In progress" value={summary.inProgress} />
          <Stat label="Done" value={summary.done} />
          <Stat label="Overdue" value={summary.overdue} tone={summary.overdue ? "danger" : "default"} />
        </section>

        {isAdmin && (
          <section className="mb-6 grid gap-5 lg:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold">Create project</h2>
              <form onSubmit={createProject} className="space-y-4">
                <Field label="Project name">
                  <input value={projectName} onChange={(event) => setProjectName(event.target.value)} required className="input" />
                </Field>
                <Field label="Description">
                  <textarea value={projectDescription} onChange={(event) => setProjectDescription(event.target.value)} required rows={3} className="input" />
                </Field>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Team members</label>
                  <div className="max-h-36 overflow-auto rounded-md border border-slate-300 p-2">
                    {users.filter((teamUser) => teamUser.id !== user?.id).length === 0 ? (
                      <p className="px-2 py-1 text-sm text-slate-500">Create member accounts first, then add them here.</p>
                    ) : (
                      users.filter((teamUser) => teamUser.id !== user?.id).map((teamUser) => (
                        <label key={teamUser.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-slate-50">
                          <input type="checkbox" checked={selectedMemberIds.includes(teamUser.id)} onChange={() => toggleMember(teamUser.id)} />
                          <span>{teamUser.name} ({teamUser.email})</span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
                <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Create project</button>
              </form>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <h2 className="mb-4 text-lg font-semibold">Create task</h2>
              <form onSubmit={createTask} className="space-y-4">
                <Field label="Task title">
                  <input value={taskTitle} onChange={(event) => setTaskTitle(event.target.value)} required className="input" />
                </Field>
                <Field label="Description">
                  <textarea value={taskDescription} onChange={(event) => setTaskDescription(event.target.value)} rows={3} className="input" />
                </Field>
                <Field label="Project">
                  <select value={taskProjectId} onChange={(event) => { setTaskProjectId(event.target.value); setTaskAssigneeId(""); }} required className="input">
                    <option value="">Select project</option>
                    {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                  </select>
                </Field>
                <Field label="Assignee">
                  <select value={taskAssigneeId} onChange={(event) => setTaskAssigneeId(event.target.value)} className="input">
                    <option value="">Unassigned</option>
                    {assignableUsers.map((member) => <option key={member.id} value={member.id}>{member.name} ({member.email})</option>)}
                  </select>
                </Field>
                <Field label="Due date">
                  <input type="date" value={taskDueDate} onChange={(event) => setTaskDueDate(event.target.value)} className="input" />
                </Field>
                <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700">Create task</button>
              </form>
            </div>
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold">Projects</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {projects.length === 0 ? (
                <p className="p-5 text-sm text-slate-500">No projects available.</p>
              ) : projects.map((project) => (
                <article key={project.id} className="p-5">
                  <h3 className="font-semibold">{project.name}</h3>
                  <p className="mt-1 text-sm text-slate-600">{project.description}</p>
                  <p className="mt-3 text-sm text-slate-500">Owner: {project.owner.name}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Members: {project.members.length ? project.members.map((member) => member.name).join(", ") : "None"}
                  </p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-lg font-semibold">Tasks</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Task</th>
                    <th className="px-5 py-3">Project</th>
                    <th className="px-5 py-3">Assignee</th>
                    <th className="px-5 py-3">Due</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tasks.length === 0 ? (
                    <tr><td colSpan={5} className="px-5 py-6 text-slate-500">No tasks available.</td></tr>
                  ) : tasks.map((task) => (
                    <tr key={task.id}>
                      <td className="px-5 py-4">
                        <p className="font-medium">{task.title}</p>
                        {task.description && <p className="mt-1 text-slate-500">{task.description}</p>}
                      </td>
                      <td className="px-5 py-4 text-slate-600">{task.project.name}</td>
                      <td className="px-5 py-4 text-slate-600">{task.assignee?.email || "Unassigned"}</td>
                      <td className="px-5 py-4 text-slate-600">{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "-"}</td>
                      <td className="px-5 py-4">
                        <select value={task.status} onChange={(event) => updateTaskStatus(task.id, event.target.value as Task["status"])} className={`rounded-md border px-2 py-1 ${statusStyles[task.status]}`}>
                          {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "danger" }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${tone === "danger" ? "text-red-600" : "text-slate-900"}`}>{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}
