import { useContext } from "react";
import { SubmissionSidebarContext } from "./SubmissionSidebarContext";

export function useSubmissionSidebar() {
  const context = useContext(SubmissionSidebarContext);
  if (!context) {
    throw new Error(
      "useSubmissionSidebar must be used within SubmissionSidebarProvider"
    );
  }
  return context;
}
