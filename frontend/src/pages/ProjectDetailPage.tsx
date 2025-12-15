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

  const { data: statsData, error: statsError } = useQuery<StatsData, StatsVars>(GET_PROJECT_STATS, {
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
      <div className="container">
        <div className="card">
          <div className="cardBd">
            <div className="titleMd">Missing projectId</div>
            <div className="sub" style={{ marginTop: 6 }}>
              Open a project from the list.
            </div>
            <div style={{ marginTop: 12 }}>
              <Link className="btn btnGhost" to="/projects">
                ← Back to projects
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const completion =
    stats?.completionRate != null
      ? Math.round(stats.completionRate * 100)
      : tasks.length > 0
      ? Math.round((grouped.DONE.length / tasks.length) * 100)
      : 0;


  const columns: CanonStatus[] = ["TODO", "IN_PROGRESS", "DONE", "OTHER"];

  return (
    <div className="container">
      <div className="topbar">
        <div>
          <h1 className="h1">Project {projectId}</h1>
          <div className="sub">
            {stats?.totalTasks ?? tasks.length} tasks · {completion}% complete
          </div>
        </div>

        <div className="row" style={{ gap: 10 }}>
          <Link className="btn btnGhost" to="/projects">
            ← Back
          </Link>
        </div>
      </div>

      {(tasksError || statsError) && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="cardBd">
            <div className="titleSm">Errors</div>
            <div className="sub" style={{ marginTop: 6 }}>
              {tasksError ? `Tasks: ${tasksError.message}` : null}
              {tasksError && statsError ? " · " : null}
              {statsError ? `Stats: ${statsError.message}` : null}
            </div>
          </div>
        </div>
      )}

      <div className="detailGrid">
        {/* LEFT: Tasks */}
        <div className="stack">
          <div className="card">
            <div className="cardHd">
              <div className="rowBetween">
                <div className="titleMd">Tasks</div>
                <span className="badge">
                  <span className="dot" />
                  {tasksLoading ? "Syncing…" : "Up to date"}
                </span>
              </div>
            </div>

            <div className="cardBd">
              <form onSubmit={onCreateTask} className="row" style={{ gap: 10 }}>
                <input
                  className="input"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="New task title"
                />
                <button className="btn btnPrimary" type="submit" disabled={creating || !newTitle.trim()}>
                  {creating ? "Adding…" : "Add task"}
                </button>
              </form>
            </div>
          </div>

          <div className="kanban">
            {tasksLoading && tasks.length === 0 ? (
              <div className="card">
                <div className="cardBd">Loading tasks…</div>
              </div>
            ) : (
              columns.map((c) => (
                <TaskColumn key={c} title={c} tasks={grouped[c]} onToggleStatus={onToggleStatus} />
              ))
            )}
          </div>
        </div>

        {/* RIGHT: Stats */}
        <div className="stack">
          <div className="card">
            <div className="cardHd">
              <div className="titleMd">Stats</div>
            </div>
            <div className="cardBd">
              <div className="statsGrid">
                <StatTile label="Total" value={stats?.totalTasks ?? tasks.length} />
                <StatTile label="Done" value={stats?.doneTasks ?? grouped.DONE.length} />
                <StatTile label="Completion" value={completion} suffix="%" />
              </div>

              <div style={{ marginTop: 12 }} className="rowBetween">
                <span className="badge badgeTodo">
                  <span className="dot" />
                  TODO
                </span>
                <div className="sub">{grouped.TODO.length}</div>
              </div>
              <div style={{ marginTop: 8 }} className="rowBetween">
                <span className="badge">
                  <span className="dot" />
                  IN_PROGRESS
                </span>
                <div className="sub">{grouped.IN_PROGRESS.length}</div>
              </div>
              <div style={{ marginTop: 8 }} className="rowBetween">
                <span className="badge badgeDone">
                  <span className="dot" />
                  DONE
                </span>
                <div className="sub">{grouped.DONE.length}</div>
              </div>
              <div style={{ marginTop: 8 }} className="rowBetween">
                <span className="badge">
                  <span className="dot" />
                  OTHER
                </span>
                <div className="sub">{grouped.OTHER.length}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="cardHd">
              <div className="titleMd">Notes</div>
            </div>
            <div className="cardBd">
              <div className="sub">
                Optional: add comments UI later. Not required for submission.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* =========================
   UI
========================= */

function StatTile(props: { label: string; value: number; suffix?: string }) {
  const { label, value, suffix } = props;
  return (
    <div className="statTile">
      <div className="statNum">
        {value}
        {suffix ?? ""}
      </div>
      <div className="statLbl">{label}</div>
    </div>
  );
}

function TaskColumn(props: { title: string; tasks: Task[]; onToggleStatus: (t: Task) => void }) {
  const { title, tasks, onToggleStatus } = props;

  return (
    <div className="kanbanCol">
      <div className="kanbanHd">
        <div className="rowBetween">
          <span>{title}</span>
          <span className="muted">{tasks.length}</span>
        </div>
      </div>

      <div className="colStack">
        {tasks.map((t) => (
          <div key={t.id} className="taskCard">
            <div className="rowBetween">
              <div className="titleSm">{t.title}</div>
              <span className={`badge ${normalizeStatus(t.status) === "DONE" ? "badgeDone" : "badgeTodo"}`}>
                <span className="dot" />
                {normalizeStatus(t.status)}
              </span>
            </div>

            <div className="row" style={{ marginTop: 10, justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => onToggleStatus(t)}>
                Toggle
              </button>
            </div>
          </div>
        ))}

        {tasks.length === 0 && <div className="empty">No tasks</div>}
      </div>
    </div>
  );
}
