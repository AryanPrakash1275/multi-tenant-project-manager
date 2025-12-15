import { gql } from "@apollo/client";

export const CREATE_TASK = gql`
  mutation CreateTask($projectId: ID!, $title: String!, $description: String) {
    createTask(projectId: $projectId, title: $title, description: $description) {
      task {
        id
        title
        status
      }
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($taskId: ID!, $status: String!) {
    updateTask(taskId: $taskId, status: $status) {
      task {
        id
        title
        status
      }
    }
  }
`;
