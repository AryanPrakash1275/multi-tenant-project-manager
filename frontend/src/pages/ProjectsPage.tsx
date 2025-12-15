import { useQuery } from "@apollo/client/react";
import { Link } from "react-router-dom";
import { GET_PROJECTS } from "../graphql/projects";

type Project = {
  id: string;
  name: string;
  status: string;
};

export default function ProjectsPage() {
  const { data, loading, error } = useQuery<{ projects: Project[] }>(GET_PROJECTS);

  if (loading) return <div className="container">Loading projects…</div>;
  if (error) return <div className="container">Error: {error.message}</div>;

  const projects = data?.projects ?? [];

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1 className="h1">Projects</h1>
          <div className="sub">Select a project to view tasks and stats.</div>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="card">
          <div className="cardBd">No projects found.</div>
        </div>
      ) : (
        <div className="grid2">
          {projects.map((p) => (
            <Link key={p.id} to={`/projects/${p.id}`} className="card cardLink">
              <div className="cardBd">
                <div className="rowBetween">
                  <div className="titleMd">{p.name}</div>
                  <span className={`badge ${p.status === "ACTIVE" ? "badgeTodo" : ""}`}>
                    <span className="dot" />
                    {p.status}
                  </span>
                </div>
                <div className="sub" style={{ marginTop: 8 }}>
                  Open project →
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
