import Link from "next/link";

export default function Home() {
  return (
    <main style={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: "24px" }}>
      <div style={{ maxWidth: 520, width: "100%", textAlign: "center" }}>
        <h1>Team Task Manager</h1>
        <p>Full-stack project manager with projects, tasks, roles, and authentication.</p>
        <div style={{ display: "flex", justifyContent: "center", gap: 12, marginTop: 24 }}>
          <Link href="/login" style={{ padding: "10px 18px", background: "#1f2937", color: "white", borderRadius: 8, textDecoration: "none" }}>
            Login
          </Link>
          <Link href="/signup" style={{ padding: "10px 18px", background: "#2563eb", color: "white", borderRadius: 8, textDecoration: "none" }}>
            Signup
          </Link>
        </div>
      </div>
    </main>
  );
}
