import { createContext, useState, useCallback, useContext } from "react";
import type { NavigationItem, SelectedSubmission } from "./submissionTypes";
import { fetchCodes } from "../../../api/api";

interface SubmissionSidebarContextType {
  selectedSubmission: SelectedSubmission | null;
  navigationItems: NavigationItem[];
  navigationIndex: number;
  codes: Map<number, string>;
  isOpen: boolean;
  isLoadingCodes: boolean;
  openSubmission: (
    submission: SelectedSubmission,
    navItems: NavigationItem[],
    navIndex: number,
    leaderboardId: string | number
  ) => void;
  navigate: (newIndex: number, item: NavigationItem) => void;
  close: () => void;
}

const SubmissionSidebarContext =
  createContext<SubmissionSidebarContextType | null>(null);

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
  const [isLoadingCodes, setIsLoadingCodes] = useState(false);

  const openSubmission = useCallback(
    (
      submission: SelectedSubmission,
      navItems: NavigationItem[],
      navIndex: number,
      leaderboardId: string | number
    ) => {
      // Immediately show sidebar
      setSelectedSubmission(submission);
      setNavigationItems(navItems);
      setNavigationIndex(navIndex);

      // Find submission IDs that aren't already cached
      const idsToFetch = navItems
        .map((item) => item.submissionId)
        .filter((id) => !codes.has(id));

      if (idsToFetch.length > 0) {
        setIsLoadingCodes(true);
        fetchCodes(leaderboardId, idsToFetch)
          .then((response) => {
            setCodes((prev) => {
              const next = new Map(prev);
              for (const item of response?.results ?? []) {
                next.set(item.submission_id, item.code);
              }
              return next;
            });
          })
          .catch((err) => {
            console.warn("[SubmissionSidebar] Failed to fetch codes:", err);
          })
          .finally(() => {
            setIsLoadingCodes(false);
          });
      }
    },
    [codes]
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

  return (
    <SubmissionSidebarContext.Provider
      value={{
        selectedSubmission,
        navigationItems,
        navigationIndex,
        codes,
        isOpen: !!selectedSubmission,
        isLoadingCodes,
        openSubmission,
        navigate,
        close,
      }}
    >
      {children}
    </SubmissionSidebarContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSubmissionSidebar(): SubmissionSidebarContextType {
  const context = useContext(SubmissionSidebarContext);
  if (!context) {
    throw new Error(
      "useSubmissionSidebar must be used within SubmissionSidebarProvider"
    );
  }
  return context;
}
