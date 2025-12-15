// src/pages/ProjectDetailPage.tsx
import React, { useMemo, useState } from "react";
import { gql, ApolloCache } from "@apollo/client";
import type { FetchResult } from "@apollo/client";
import { useQuery, useMutation } from "@apollo/client/react";
import { Link, useParams } from "react-router-dom";

/* =========================
   GraphQL
========================= */

const GET_TASKS = gql`
  query Tasks($projectId: ID!) {
    tasks(projectId: $projectId) {
      id
      title
      status
      dueDate
      createdAt
      __typename
    }
  }
`;

const GET_PROJECT_STATS = gql`
  query ProjectStats($projectId: ID!) {
    projectStats(projectId: $projectId) {
      totalTasks
      doneTasks
      completionRate
      __typename
    }
  }
`;

const CREATE_TASK = gql`
  mutation CreateTask($projectId: ID!, $title: String!) {
    createTask(projectId: $projectId, title: $title) {
      task {
        id
        title
        status
        dueDate
        createdAt
        __typename
      }
      __typename
    }
  }
`;

const UPDATE_TASK = gql`
  mutation UpdateTask($taskId: ID!, $status: String!) {
    updateTask(taskId: $taskId, status: $status) {
      task {
        id
        status
        __typename
      }
      __typename
    }
  }
`;

/* =========================
   Types
========================= */

type Task = {
  __typename?: string;
  id: string;
  title: string;
  status: string;
  dueDate?: string | null;
  createdAt?: string | null;
};

type ProjectStats = {
  __typename?: string;
  totalTasks: number;
  doneTasks: number;
  completionRate: number | null;
};

type TasksData = { tasks: Task[] };
type TasksVars = { projectId: string };

type StatsData = { projectStats: ProjectStats };
type StatsVars = { projectId: string };

type CreateTaskData = {
  createTask: {
    __typename?: string;
    task: Task;
  };
};

type CreateTaskVars = {
  projectId: string;
  title: string;
};

type UpdateTaskData = {
  updateTask: {
    __typename?: string;
    task: {
      __typename?: string;
      id: string;
      status: string;
    };
  };
};

type UpdateTaskVars = {
  taskId: string;
  status: string;
};

/* =========================
   Helpers
========================= */

type CanonStatus = "TODO" | "IN_PROGRESS" | "DONE" | "OTHER";

function normalizeStatus(raw: string): CanonStatus {
  const s = String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "_");

  if (s === "TODO" || s === "TO_DO") return "TODO";
  if (s === "IN_PROGRESS" || s === "INPROGRESS" || s === "IN-PROGRESS") return "IN_PROGRESS";
  if (s === "DONE" || s === "COMPLETED" || s === "COMPLETE") return "DONE";
  return "OTHER";
}

function nextStatus(raw: string): CanonStatus {
  const s = normalizeStatus(raw);
  if (s === "TODO") return "IN_PROGRESS";
  if (s === "IN_PROGRESS") return "DONE";
  return "TODO";
}

function updateTasksCache(cache: ApolloCache, projectId: string, updater: (tasks: Task[]) => Task[]) {
  const existing = cache.readQuery<TasksData, TasksVars>({
    query: GET_TASKS,
    variables: { projectId },
  });
  if (!existing?.tasks) return;

  cache.writeQuery<TasksData, TasksVars>({
    query: GET_TASKS,
    variables: { projectId },
    data: { tasks: updater(existing.tasks) },
  });
}

function updateStatsCache(cache: ApolloCache, projectId: string, updater: (stats: ProjectStats) => ProjectStats) {
  const existing = cache.readQuery<StatsData, StatsVars>({
    query: GET_PROJECT_STATS,
    variables: { projectId },
  });
  if (!existing?.projectStats) return;

  cache.writeQuery<StatsData, StatsVars>({
    query: GET_PROJECT_STATS,
    variables: { projectId },
    data: { projectStats: updater(existing.projectStats) },
  });
}

/* =========================
   Component
========================= */

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const [newTitle, setNewTitle] = useState("");

  const {
    data: tasksData,
    loading: tasksLoading,
    error: tasksError,
  } = useQuery<TasksData, TasksVars>(GET_TASKS, {
    variables: { projectId: projectId ?? "" },
    skip: !projectId,
    fetchPolicy: "cache-and-network",
  });

  const {
    data: statsData,
    error: statsError,
  } = useQuery<StatsData, StatsVars>(GET_PROJECT_STATS, {
    variables: { projectId: projectId ?? "" },
    skip: !projectId,
    fetchPolicy: "cache-and-network",
  });

  const tasks = useMemo(() => tasksData?.tasks ?? [], [tasksData?.tasks]);
  const stats = statsData?.projectStats;

  const grouped = useMemo(() => {
    const map: Record<CanonStatus, Task[]> = { TODO: [], IN_PROGRESS: [], DONE: [], OTHER: [] };
    for (const t of tasks) map[normalizeStatus(t.status)].push(t);
    return map;
  }, [tasks]);

  const [createTask, { loading: creating }] = useMutation<CreateTaskData, CreateTaskVars>(CREATE_TASK, {
    update(cache: ApolloCache, result: FetchResult<CreateTaskData>) {
      const created = result.data?.createTask.task;
      if (!created || !projectId) return;

      updateTasksCache(cache, projectId, (prev) => {
        if (prev.some((x) => x.id === created.id)) return prev;
        return [created, ...prev];
      });

      updateStatsCache(cache, projectId, (s) => ({
        ...s,
        totalTasks: s.totalTasks + 1,
      }));
    },
  });

  const [updateTask] = useMutation<UpdateTaskData, UpdateTaskVars>(UPDATE_TASK);

  function onCreateTask(e: React.FormEvent) {
    e.preventDefault();
    if (!projectId) return;

    const title = newTitle.trim();
    if (!title) return;

    setNewTitle("");

    const now = new Date().toISOString();
    const tempId = `temp-${Math.random().toString(36).slice(2)}`;

    createTask({
      variables: { projectId, title },
      optimisticResponse: {
        createTask: {
          __typename: "CreateTaskPayload",
          task: {
            __typename: "TaskType",
            id: tempId,
            title,
            status: "TODO",
            dueDate: null,
            createdAt: now,
          },
        },
      },
    });
  }

  function onToggleStatus(t: Task) {
    if (!projectId) return;

    const to = nextStatus(t.status);

    updateTask({
      variables: { taskId: t.id, status: to },
      optimisticResponse: {
        updateTask: {
          __typename: "UpdateTaskPayload",
          task: {
            __typename: "TaskType",
            id: t.id,
            status: to,
          },
        },
      },
      update(cache: ApolloCache, result: FetchResult<UpdateTaskData>) {
        if (!projectId) return;

        const updated = result.data?.updateTask.task ?? { id: t.id, status: to };

        updateTasksCache(cache, projectId, (prev) =>
          prev.map((x) => (x.id === updated.id ? { ...x, status: updated.status } : x))
        );
      },
    });
  }

  if (!projectId) {
    return (
      <div style={{ padding: 16 }}>
        <p>Missing projectId</p>
        <Link to="/projects">Back</Link>
      </div>
    );
  }

  const completion =
    stats?.completionRate != null
      ? Math.round(stats.completionRate)
      : tasks.length > 0
      ? Math.round((grouped.DONE.length / tasks.length) * 100)
      : 0;

  const columns: CanonStatus[] = ["TODO", "IN_PROGRESS", "DONE", "OTHER"];

  return (
    <div style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Project {projectId}</h2>
        <Link to="/projects">← Back</Link>
      </div>

      {(tasksError || statsError) && (
        <div style={{ marginTop: 12 }}>
          <div>{tasksError ? `Tasks: ${tasksError.message}` : null}</div>
          <div>{statsError ? `Stats: ${statsError.message}` : null}</div>
        </div>
      )}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
        <StatCard label="Total tasks" value={stats?.totalTasks ?? tasks.length} loading={!stats && tasksLoading} />
        <StatCard label="Done tasks" value={stats?.doneTasks ?? grouped.DONE.length} loading={!stats && tasksLoading} />
        <StatCard label="Completion %" value={completion} loading={!stats && tasksLoading} />
        <StatCard label="Other" value={grouped.OTHER.length} loading={tasksLoading && tasks.length === 0} />
      </div>

      <form onSubmit={onCreateTask} style={{ marginTop: 16, display: "flex", gap: 8 }}>
        <input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New task title"
          style={{ flex: 1, padding: "10px 12px" }}
        />
        <button type="submit" disabled={creating || !newTitle.trim()} style={{ padding: "10px 12px" }}>
          {creating ? "Adding..." : "Add"}
        </button>
      </form>

      <div style={{ marginTop: 16 }}>
        {tasksLoading && tasks.length === 0 ? (
          <div>Loading tasks...</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {columns.map((c) => (
              <TaskColumn key={c} title={c} tasks={grouped[c]} onToggleStatus={onToggleStatus} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* =========================
   UI
========================= */

function StatCard(props: { label: string; value?: number; loading: boolean }) {
  const { label, value, loading } = props;
  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 12, color: "#666" }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>{loading && value == null ? "…" : value ?? 0}</div>
    </div>
  );
}

function TaskColumn(props: { title: string; tasks: Task[]; onToggleStatus: (t: Task) => void }) {
  const { title, tasks, onToggleStatus } = props;

  return (
    <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 12, minHeight: 180 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0, fontSize: 14 }}>{title}</h3>
        <span style={{ fontSize: 12, color: "#666" }}>{tasks.length}</span>
      </div>

      <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
        {tasks.map((t) => (
          <div key={t.id} style={{ border: "1px solid #eee", borderRadius: 8, padding: 10 }}>
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            <div style={{ marginTop: 6, fontSize: 12, color: "#777" }}>status: {t.status}</div>
            <div style={{ marginTop: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button type="button" onClick={() => onToggleStatus(t)} style={{ padding: "6px 10px" }}>
                Toggle
              </button>
            </div>
          </div>
        ))}

        {tasks.length === 0 && <div style={{ color: "#777", fontSize: 13 }}>No tasks</div>}
      </div>
    </div>
  );
}
