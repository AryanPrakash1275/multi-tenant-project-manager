import { gql } from "@apollo/client";

export const GET_PROJECT_DETAIL = gql`
  query GetProjectDetail($projectId: Int!) {
    tasks(projectId: $projectId) {
      id
      title
      status
    }
    projectStats(projectId: $projectId) {
      totalTasks
      doneTasks
      completionRate
    }
  }
`;
