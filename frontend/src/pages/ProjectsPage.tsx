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

  if (loading) return <div className="p-6">Loading projects…</div>;
  if (error) return <div style={{ padding: 24, color: "red" }}>{error.message}</div>;

  if (!data || data.projects.length === 0) {
    return <div className="p-6">No projects found.</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Projects</h1>
      <ul className="space-y-3">
        {data.projects.map((p) => (
          <li
            key={p.id}
            className="border rounded p-4 hover:bg-gray-50"
          >
            <Link to={`/projects/${p.id}`} className="font-medium">
              {p.name}
            </Link>
            <div className="text-sm text-gray-500">{p.status}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
