import { createContext, useState, useCallback, useContext, useRef } from "react";
import type { NavigationItem, SelectedSubmission } from "./submissionTypes";
import { fetchCodes } from "../../../api/api";

// Actions context — stable references, rarely changes
interface SubmissionSidebarActionsType {
  openSubmission: (
    submission: SelectedSubmission,
    navItems: NavigationItem[],
    navIndex: number,
    leaderboardId: string | number
  ) => void;
}

// State context — changes on every navigation
interface SubmissionSidebarStateType {
  selectedSubmission: SelectedSubmission | null;
  navigationItems: NavigationItem[];
  navigationIndex: number;
  codes: Map<number, string>;
  isOpen: boolean;
  isLoadingCodes: boolean;
  navigate: (newIndex: number, item: NavigationItem) => void;
  close: () => void;
}

const SubmissionSidebarActionsContext =
  createContext<SubmissionSidebarActionsType | null>(null);

const SubmissionSidebarStateContext =
  createContext<SubmissionSidebarStateType | null>(null);

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
  const codesRef = useRef(codes);
  codesRef.current = codes;

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
        .filter((id) => !codesRef.current.has(id));

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

  return (
    <SubmissionSidebarActionsContext.Provider value={{ openSubmission }}>
      <SubmissionSidebarStateContext.Provider
        value={{
          selectedSubmission,
          navigationItems,
          navigationIndex,
          codes,
          isOpen: !!selectedSubmission,
          isLoadingCodes,
          navigate,
          close,
        }}
      >
        {children}
      </SubmissionSidebarStateContext.Provider>
    </SubmissionSidebarActionsContext.Provider>
  );
}

// For components that only need to open the sidebar (RankingsList, UserTrendChart)
// eslint-disable-next-line react-refresh/only-export-components
export function useSubmissionSidebarActions(): SubmissionSidebarActionsType {
  const context = useContext(SubmissionSidebarActionsContext);
  if (!context) {
    throw new Error(
      "useSubmissionSidebarActions must be used within SubmissionSidebarProvider"
    );
  }
  return context;
}

// For the sidebar component that needs the full state
// eslint-disable-next-line react-refresh/only-export-components
export function useSubmissionSidebarState(): SubmissionSidebarStateType {
  const context = useContext(SubmissionSidebarStateContext);
  if (!context) {
    throw new Error(
      "useSubmissionSidebarState must be used within SubmissionSidebarProvider"
    );
  }
  return context;
}
