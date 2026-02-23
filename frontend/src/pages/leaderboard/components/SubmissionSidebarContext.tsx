import { createContext, useContext, useState, useCallback } from "react";
import type { NavigationItem, SelectedSubmission } from "./submissionTypes";

interface SubmissionSidebarContextType {
  selectedSubmission: SelectedSubmission | null;
  navigationItems: NavigationItem[];
  navigationIndex: number;
  codes: Map<number, string>;
  isOpen: boolean;
  openSubmission: (
    submission: SelectedSubmission,
    navItems: NavigationItem[],
    navIndex: number,
    codesMap: Map<number, string>
  ) => void;
  navigate: (newIndex: number, item: NavigationItem) => void;
  close: () => void;
  updateCodes: (codesMap: Map<number, string>) => void;
}

const SubmissionSidebarContext = createContext<SubmissionSidebarContextType | null>(null);

export function SubmissionSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedSubmission, setSelectedSubmission] =
    useState<SelectedSubmission | null>(null);
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>([]);
  const [navigationIndex, setNavigationIndex] = useState(0);
  const [codes, setCodes] = useState<Map<number, string>>(new Map());

  const openSubmission = useCallback(
    (
      submission: SelectedSubmission,
      navItems: NavigationItem[],
      navIndex: number,
      codesMap: Map<number, string>
    ) => {
      setSelectedSubmission(submission);
      setNavigationItems(navItems);
      setNavigationIndex(navIndex);
      setCodes(codesMap);
    },
    []
  );

  const navigate = useCallback((newIndex: number, item: NavigationItem) => {
    setNavigationIndex(newIndex);
    setSelectedSubmission((prev) =>
      prev
        ? {
            ...prev,
            submissionId: item.submissionId,
            userName: item.userName,
            fileName: item.fileName,
            timestamp: item.timestamp,
            score: item.score,
            originalTimestamp: item.originalTimestamp,
          }
        : null
    );
  }, []);

  const close = useCallback(() => {
    setSelectedSubmission(null);
  }, []);

  const updateCodes = useCallback((codesMap: Map<number, string>) => {
    setCodes(codesMap);
  }, []);

  return (
    <SubmissionSidebarContext.Provider
      value={{
        selectedSubmission,
        navigationItems,
        navigationIndex,
        codes,
        isOpen: !!selectedSubmission,
        openSubmission,
        navigate,
        close,
        updateCodes,
      }}
    >
      {children}
    </SubmissionSidebarContext.Provider>
  );
}

export function useSubmissionSidebar() {
  const context = useContext(SubmissionSidebarContext);
  if (!context) {
    throw new Error(
      "useSubmissionSidebar must be used within SubmissionSidebarProvider"
    );
  }
  return context;
}
