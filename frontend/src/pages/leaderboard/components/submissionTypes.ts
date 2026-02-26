export interface NavigationItem {
  submissionId: number;
  userName: string;
  fileName: string;
  timestamp: number;
  score: number;
  originalTimestamp?: number;
}

export interface SelectedSubmission {
  submissionId: number;
  userName: string;
  fileName: string;
  isFastest?: boolean;
  timestamp?: number;
  score?: number;
  originalTimestamp?: number;
}
