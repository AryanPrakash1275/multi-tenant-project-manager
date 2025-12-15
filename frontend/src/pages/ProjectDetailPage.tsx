import { useParams } from "react-router-dom";
import { useQuery } from "@apollo/client/react";
import { GET_PROJECT_DETAIL } from "../graphql/projectDetail";

type Task = {
  id: string;
  title: string;
  status: string;
};

type ProjectStats = {
  totalTasks: number;
  doneTasks: number;
  completionRate: number;
};

type GetProjectDetailData = {
  tasks: Task[];
  projectStats: ProjectStats;
};

type GetProjectDetailVars = {
  projectId: string;
};

export default function ProjectDetailPage() {
  const { projectId } = useParams();

  const { data, loading, error } = useQuery<GetProjectDetailData, GetProjectDetailVars>(
    GET_PROJECT_DETAIL,
    {
      variables: { projectId: projectId ?? "" },
      skip: !projectId,
    }
  );

  if (!projectId) {
    return <div className="p-6 text-red-600">Missing projectId</div>;
  }

  if (loading) return <div className="p-6">Loading project…</div>;
  if (error) return <div className="p-6 text-red-600">{error.message}</div>;
  if (!data) return <div className="p-6">No data</div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Stats</h2>
        <p>Total: {data.projectStats.totalTasks}</p>
        <p>Done: {data.projectStats.doneTasks}</p>
        <p>Completion: {(data.projectStats.completionRate * 100).toFixed(0)}%</p>
      </div>

      <div>
        <h2 className="text-xl font-semibold">Tasks</h2>
        <ul className="space-y-2">
          {data.tasks.map((t) => (
            <li key={t.id} className="border p-3 rounded">
              {t.title} — <span className="text-sm text-gray-500">{t.status}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
