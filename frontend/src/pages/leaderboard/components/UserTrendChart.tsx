import React, { useEffect, useState, useCallback, useRef, useMemo } from "react";
import ReactECharts from "echarts-for-react";
import {
  Box,
  Typography,
  TextField,
  FormControlLabel,
  Switch,
  Stack,
  Autocomplete,
  Chip,
  CircularProgress,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Radio,
  RadioGroup,
} from "@mui/material";
import {
  fetchUserTrend,
  fetchCustomTrend,
  fetchFastestTrend,
  fetchCodes,
  searchUsers,
  type UserTrendResponse,
  type CustomTrendResponse,
  type FastestTrendResponse,
  type UserSearchResult,
} from "../../../api/api";
import { isExpired } from "../../../lib/date/utils";
import { useAuthStore } from "../../../lib/store/authStore";
import { formatMicrosecondsNum, formatMicroseconds } from "../../../lib/utils/ranking";
import { useThemeStore } from "../../../lib/store/themeStore";
import type {
  NavigationItem,
  SelectedSubmission,
} from "./submissionTypes";
import { useSubmissionSidebar } from "./SubmissionSidebarContext";

// Display name prefix for custom (KernelAgent) entries
const CUSTOM_ENTRY_PREFIX = "KernelAgent";

// Display label for the fastest trend option
const FASTEST_TREND_LABEL = "⚡ Fastest (All Users)";

// Simple option type - custom entries are identified by id starting with "custom_" to avoid collisions
interface TrendOption {
  id: string;
  label: string;
}

interface RankingEntry {
  user_name: string;
  score: number;
  file_name?: string | null;
  submission_id?: number | null;
}

interface UserTrendChartProps {
  leaderboardId: string;
  defaultUsers?: Array<{ userId: string; username: string }> | null;
  defaultGpuType?: string | null;
  rankings?: Record<string, RankingEntry[]> | null;
  deadline?: string | null;
}

// Extended data point interface with submission_id for chart data
interface ChartDataPoint {
  value: [number, number];
  gpu_type?: string | null;
  user_name?: string | null;
  submission_id?: number | null;
  originalTimestamp?: number;
}

function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash;
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 65 + (Math.abs(hash >> 8) % 20);
  const lightness = 45 + (Math.abs(hash >> 16) % 15);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

// Convert data points to daily best-so-far series
// Creates a data point at midnight for each day from first submission to last submission
// If globalEndDate is provided and later than last submission, adds a final point to extend the line flat
function toDailyBestSeries<T extends { value: [number, number]; gpu_type?: string | null; user_name?: string | null }>(
  dataPoints: T[],
  globalEndDate?: Date
): (T & { originalTimestamp?: number })[] {
  if (dataPoints.length === 0) return [];

  // Sort by time
  const sorted = [...dataPoints].sort((a, b) => a.value[0] - b.value[0]);

  // Get date range: first submission to last submission
  const firstDate = new Date(sorted[0].value[0]);
  const userLastDate = new Date(sorted[sorted.length - 1].value[0]);

  // Normalize to midnight UTC
  const startMidnight = new Date(Date.UTC(firstDate.getUTCFullYear(), firstDate.getUTCMonth(), firstDate.getUTCDate()));
  const userEndMidnight = new Date(Date.UTC(userLastDate.getUTCFullYear(), userLastDate.getUTCMonth(), userLastDate.getUTCDate()));

  // Build a map of timestamp -> data point for quick lookup
  const submissionsByTime = sorted.map(p => ({ time: p.value[0], score: p.value[1], point: p }));

  const result: (T & { originalTimestamp?: number })[] = [];
  let runningMin = Infinity;
  let currentBestPoint: T = sorted[0]; // Track the point that holds the current record
  let currentBestOriginalTime: number = sorted[0].value[0]; // Track original submission time
  let submissionIndex = 0;

  // Iterate through each day up to user's last submission
  const currentDate = new Date(startMidnight);
  while (currentDate <= userEndMidnight) {
    const dayEnd = currentDate.getTime() + 24 * 60 * 60 * 1000; // End of this day

    // Process all submissions up to this day's end
    while (submissionIndex < submissionsByTime.length && submissionsByTime[submissionIndex].time < dayEnd) {
      if (submissionsByTime[submissionIndex].score < runningMin) {
        runningMin = submissionsByTime[submissionIndex].score;
        currentBestPoint = submissionsByTime[submissionIndex].point; // Update the record holder
        currentBestOriginalTime = submissionsByTime[submissionIndex].time; // Track original time
      }
      submissionIndex++;
    }

    // Only add a point if we have at least one submission by this day
    if (runningMin !== Infinity) {
      // Use the current best point as template to preserve metadata (like user_name)
      // Add originalTimestamp to track when the submission was actually made
      result.push({
        ...currentBestPoint,
        value: [currentDate.getTime(), runningMin] as [number, number],
        originalTimestamp: currentBestOriginalTime,
      });
    }

    // Move to next day
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  // If globalEndDate is provided and later than user's last submission, add a single point to extend flat
  if (globalEndDate && runningMin !== Infinity) {
    const globalEndMidnight = new Date(Date.UTC(globalEndDate.getUTCFullYear(), globalEndDate.getUTCMonth(), globalEndDate.getUTCDate()));
    if (globalEndMidnight.getTime() > userEndMidnight.getTime()) {
      result.push({
        ...currentBestPoint,
        value: [globalEndMidnight.getTime(), runningMin] as [number, number],
        originalTimestamp: currentBestOriginalTime,
      });
    }
  }

  return result;
}

export default function UserTrendChart({ leaderboardId, defaultUsers, defaultGpuType, rankings, deadline }: UserTrendChartProps) {
  // Code viewing is allowed for closed contests (mirrors RankingLists logic)
  // Backend enforces BLOCKED_CODE_LEADERBOARD_LIST for blocked contests
  const isContestClosed = !!deadline && isExpired(deadline);
  const isCodeViewingAllowed = isContestClosed;

  // Auth state for code viewing (same pattern as RankingLists)
  const me = useAuthStore((s) => s.me);
  const isAdmin = !!me?.user?.is_admin;

  // Pre-fetched codes map (same pattern as RankingLists)
  const [codes, setCodes] = useState<Map<number, string>>(new Map());

  // Use sidebar context instead of local state
  const { openSubmission } = useSubmissionSidebar();

  const [data, setData] = useState<UserTrendResponse | null>(null);
  const [customData, setCustomData] = useState<CustomTrendResponse | null>(null);
  const [fastestTrendData, setFastestTrendData] = useState<FastestTrendResponse | null>(null);
  const [showFastestTrend, setShowFastestTrend] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGpuType, setSelectedGpuType] = useState<string>(defaultGpuType || "");
  const [resetting, setResetting] = useState(false);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isDark = resolvedMode === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";

  const [selectedOptions, setSelectedOptions] = useState<TrendOption[]>(() => {
    if (defaultUsers && defaultUsers.length > 0) {
      return defaultUsers.map((user) => ({
        id: user.userId,
        label: user.username,
      }));
    }
    return [];
  });
  const [userOptions, setUserOptions] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [clipOffscreen, setClipOffscreen] = useState(false);
  const [displayMode, setDisplayMode] = useState<"all" | "best">("best");

  const chartRef = useRef<ReactECharts>(null);
  const [zoomState, setZoomState] = useState<Array<{ startValue?: number; endValue?: number }>>([]);

  // Local state for axis input fields (not applied until button clicked)
  const [xStartInput, setXStartInput] = useState("");
  const [xEndInput, setXEndInput] = useState("");
  const [yMinInput, setYMinInput] = useState("");
  const [yMaxInput, setYMaxInput] = useState("");

  // Capture zoom state when it changes (using values, not percentages)
  const onDataZoom = useCallback(() => {
    const chartInstance = chartRef.current?.getEchartsInstance();
    if (chartInstance) {
      const opt = chartInstance.getOption() as { dataZoom?: Array<{ startValue?: number; endValue?: number }> };
      if (opt.dataZoom) {
        setZoomState(opt.dataZoom.map((dz) => ({
          startValue: dz.startValue,
          endValue: dz.endValue,
        })));
        // Sync input fields with current zoom
        if (opt.dataZoom[0]?.startValue) {
          setXStartInput(new Date(opt.dataZoom[0].startValue).toISOString().split("T")[0]);
        }
        if (opt.dataZoom[0]?.endValue) {
          setXEndInput(new Date(opt.dataZoom[0].endValue).toISOString().split("T")[0]);
        }
        if (opt.dataZoom[1]?.startValue !== undefined) {
          setYMinInput(formatMicrosecondsNum(opt.dataZoom[1].startValue).toString());
        }
        if (opt.dataZoom[1]?.endValue !== undefined) {
          setYMaxInput(formatMicrosecondsNum(opt.dataZoom[1].endValue).toString());
        }
      }
    }
  }, []);

  // Clear saved zoom state when restore is triggered
  const onRestore = useCallback(() => {
    setZoomState([]);
    setXStartInput("");
    setXEndInput("");
    setYMinInput("");
    setYMaxInput("");
  }, []);

  // Memoize effectiveGpuType for the click handler - defined before onChartClick uses it
  const effectiveGpuType = useMemo(() => {
    const fastestTrendGpuTypes = fastestTrendData?.time_series ? Object.keys(fastestTrendData.time_series) : [];
    const gpuTypesFromUsers = data?.time_series ? Object.keys(data.time_series) : [];
    const gpuTypesFromCustom = customData?.time_series ? Object.keys(customData.time_series) : [];
    const allGpuTypes = [...new Set([...gpuTypesFromUsers, ...gpuTypesFromCustom, ...fastestTrendGpuTypes])];
    return selectedGpuType || allGpuTypes[0] || "";
  }, [selectedGpuType, data, customData, fastestTrendData]);

  // Collect all submission IDs from chart data for pre-fetching
  const submissionIds = useMemo(() => {
    const ids: number[] = [];
    // From user trend data
    if (data?.time_series) {
      Object.values(data.time_series).forEach((gpuData) => {
        Object.values(gpuData).forEach((points) => {
          points.forEach((point) => {
            if (point.submission_id) ids.push(point.submission_id);
          });
        });
      });
    }
    // From custom trend data
    if (customData?.time_series) {
      Object.values(customData.time_series).forEach((gpuData) => {
        Object.values(gpuData).forEach((points) => {
          points.forEach((point) => {
            if (point.submission_id) ids.push(point.submission_id);
          });
        });
      });
    }
    // From fastest trend data
    if (fastestTrendData?.time_series) {
      Object.values(fastestTrendData.time_series).forEach((gpuData) => {
        gpuData.fastest?.forEach((point) => {
          if (point.submission_id) ids.push(point.submission_id);
        });
      });
    }
    return [...new Set(ids)]; // deduplicate
  }, [data, customData, fastestTrendData]);

  // Pre-fetch codes when contest is closed
  useEffect(() => {
    if (!isCodeViewingAllowed && !isAdmin) return;
    if (!submissionIds || submissionIds.length === 0 || !leaderboardId) return;
    fetchCodes(leaderboardId, submissionIds)
      .then((response) => {
        const map = new Map<number, string>();
        for (const item of response?.results ?? []) {
          map.set(item.submission_id, item.code);
        }
        setCodes(map);
      })
      .catch((err) => {
        // soft error - not critical
        console.warn("[UserTrendChart] Failed to fetch codes:", err);
      });
  }, [leaderboardId, submissionIds, isCodeViewingAllowed, isAdmin]);

  // Simple click handler - just set the selected submission
  // Also collects all datapoints from the series for navigation
  const onChartClick = useCallback(
    (params: {
      componentType: string;
      seriesName: string;
      seriesIndex: number;
      dataIndex: number;
      data: ChartDataPoint;
      value: [number, number];
    }) => {
      if (!isCodeViewingAllowed) return;
      if (params.componentType !== "series") return;
      if (!params.data?.submission_id) return;

      // Check if this is from the Fastest trend series
      const isFastest = params.seriesName === FASTEST_TREND_LABEL;

      // Get the chart instance to access all series data
      const chartInstance = chartRef.current?.getEchartsInstance();
      if (!chartInstance) return;

      const option = chartInstance.getOption();
      const allSeries = option?.series as Array<{
        name: string;
        data: Array<ChartDataPoint>;
      }>;
      const clickedSeries = allSeries?.[params.seriesIndex];

          if (clickedSeries?.data) {
            // Build navigation items from all points in this series (preserve original order)
            const navItems: NavigationItem[] = clickedSeries.data
              .filter(
                (d): d is ChartDataPoint & { submission_id: number } =>
                  typeof d.submission_id === "number"
              )
              .map((d) => ({
                submissionId: d.submission_id,
                userName: d.user_name || params.seriesName || "Unknown",
                fileName: `submission_${d.submission_id}.py`,
                timestamp: d.value[0],
                score: d.value[1],
                originalTimestamp: d.originalTimestamp,
              }));

            // Use dataIndex directly since it corresponds to the clicked point's position
            const clickedIndex = params.dataIndex;

            // Set the selected submission using the navItem at clicked index
            if (clickedIndex >= 0 && clickedIndex < navItems.length) {
              const item = navItems[clickedIndex];
              const submission: SelectedSubmission = {
                submissionId: item.submissionId,
                userName: item.userName,
                fileName: item.fileName,
                isFastest,
                timestamp: item.timestamp,
                score: item.score,
                originalTimestamp: item.originalTimestamp,
              };
              openSubmission(submission, navItems, clickedIndex, codes);
              return;
            }
          }

          // Fallback: create a single-item navigation
          const fallbackSubmission: SelectedSubmission = {
            submissionId: params.data.submission_id,
            userName: params.data.user_name || params.seriesName || "Unknown",
            fileName: `submission_${params.data.submission_id}.py`,
            isFastest,
            timestamp: params.value[0],
            score: params.value[1],
            originalTimestamp: params.data.originalTimestamp,
          };
          const fallbackNavItems: NavigationItem[] = [{
            submissionId: params.data.submission_id,
            userName: params.data.user_name || params.seriesName || "Unknown",
            fileName: `submission_${params.data.submission_id}.py`,
            timestamp: params.value[0],
            score: params.value[1],
            originalTimestamp: params.data.originalTimestamp,
          }];
          openSubmission(fallbackSubmission, fallbackNavItems, 0, codes);
    },
    [isCodeViewingAllowed, codes, openSubmission]
  );

  const chartEvents = useMemo(
    () => ({
      datazoom: onDataZoom,
      restore: onRestore,
      ...(isCodeViewingAllowed && { click: onChartClick }),
    }),
    [onDataZoom, onRestore, isCodeViewingAllowed, onChartClick]
  );

  // Fetch custom trend data on mount
  useEffect(() => {
    const loadCustomData = async () => {
      try {
        const result = await fetchCustomTrend(leaderboardId);
        setCustomData(result);
      } catch (err) {
        console.error("Failed to load custom trend data:", err);
      }
    };
    loadCustomData();
  }, [leaderboardId]);

  // Fetch fastest trend data when checkbox is toggled on
  useEffect(() => {
    if (showFastestTrend && !fastestTrendData) {
      const loadFastestTrend = async () => {
        try {
          const result = await fetchFastestTrend(leaderboardId);
          setFastestTrendData(result);
        } catch (err) {
          console.error("Failed to load fastest trend data:", err);
        }
      };
      loadFastestTrend();
    }
  }, [showFastestTrend, fastestTrendData, leaderboardId]);

  // Build combined options: users + custom entries
  // Custom entries are identified by id starting with "custom_"
  // Sort all options alphabetically by label
  const combinedOptions: TrendOption[] = [
    ...userOptions.map((u) => ({
      id: u.user_id,
      label: u.username,
    })),
    ...(customData?.time_series?.[selectedGpuType]
      ? Object.keys(customData.time_series[selectedGpuType]).map((model) => ({
          id: `custom_${model}`,
          label: `${CUSTOM_ENTRY_PREFIX} - ${model}`,
        }))
      : []),
  ].sort((a, b) => a.label.localeCompare(b.label));

  const loadData = useCallback(
    async (userIds: string[]) => {
      if (userIds.length === 0) {
        setData(null);
        setSelectedGpuType("");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const result = await fetchUserTrend(leaderboardId, userIds);
        setData(result);
        // Set default GPU type to the one with the most unique users
        const gpuTypes = Object.keys(result.time_series || {});
        if (gpuTypes.length > 0 && !gpuTypes.includes(selectedGpuType)) {
          // Count unique users per GPU type
          let maxUsers = 0;
          let defaultGpu = gpuTypes[0];
          for (const gpuType of gpuTypes) {
            const gpuData = result.time_series[gpuType];
            const userCount = gpuData ? Object.keys(gpuData).length : 0;
            if (userCount > maxUsers) {
              maxUsers = userCount;
              defaultGpu = gpuType;
            }
          }
          setSelectedGpuType(defaultGpu);
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    },
    [leaderboardId, selectedGpuType]
  );

  // Load initial suggestions on mount (first 5 alphabetically)
  useEffect(() => {
    const loadInitialUsers = async () => {
      setSearchLoading(true);
      try {
        const result = await searchUsers(leaderboardId, "", 5);
        setUserOptions(result.users);
      } catch (err) {
        console.error("Failed to load initial users:", err);
      } finally {
        setSearchLoading(false);
      }
    };
    loadInitialUsers();
  }, [leaderboardId]);

  // Load data for default users when they arrive (only when defaultUsers changes)
  useEffect(() => {
    if (defaultUsers && defaultUsers.length > 0) {
      // Update selected options when defaults arrive
      setSelectedOptions(defaultUsers.map((user) => ({
        id: user.userId,
        label: user.username,
      })));
      // Fetch data for the default users
      const userIds = defaultUsers.map((u) => u.userId);
      fetchUserTrend(leaderboardId, userIds).then((result) => {
        setData(result);
      }).catch((err) => {
        console.error("Failed to load default users data:", err);
      });
    }
  }, [defaultUsers, leaderboardId]);

  // Update GPU type when defaultGpuType changes
  useEffect(() => {
    if (defaultGpuType) {
      setSelectedGpuType(defaultGpuType);
    }
  }, [defaultGpuType]);

  // Search users when input changes
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const result = await searchUsers(leaderboardId, inputValue);
        setUserOptions(result.users);
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [inputValue, leaderboardId]);

  // Helper to check if option is a custom entry (id starts with "custom_")
  const isCustomEntry = (opt: TrendOption) => opt.id.startsWith("custom_");

  const handleOptionSelectionChange = (
    _event: React.SyntheticEvent,
    newValue: TrendOption[]
  ) => {
    setSelectedOptions(newValue);
    const userIds = newValue
      .filter((opt) => !isCustomEntry(opt))
      .map((opt) => opt.id);
    loadData(userIds);
  };

  // Reset to top 5 users for current GPU type
  const handleReset = async () => {
    if (!rankings || !selectedGpuType) return;

    const gpuRankings = rankings[selectedGpuType];
    if (!gpuRankings || gpuRankings.length === 0) return;

    setResetting(true);
    try {
      // Get top 5 users for this GPU type
      const topUserNames = gpuRankings
        .slice(0, 5)
        .map((r) => r.user_name)
        .filter(Boolean);

      if (topUserNames.length === 0) return;

      // Search for each user by username to get their user_id
      const userPromises = topUserNames.map((userName: string) =>
        searchUsers(leaderboardId, userName, 1)
      );
      const results = await Promise.all(userPromises);

      const foundUsers = results
        .filter((result) => result.users && result.users.length > 0)
        .map((result) => ({
          id: result.users[0].user_id,
          label: result.users[0].username,
        }));

      setSelectedOptions(foundUsers);
      const userIds = foundUsers.map((u) => u.id);
      loadData(userIds);
    } catch (err) {
      console.error("Failed to reset to top users:", err);
    } finally {
      setResetting(false);
    }
  };

  // Get selected users and custom entries separately
  const selectedUsers = selectedOptions.filter((opt) => !isCustomEntry(opt));
  const selectedCustomEntries = selectedOptions.filter((opt) => isCustomEntry(opt));

  // GPU types from user data or custom data
  const gpuTypesFromUsers = data?.time_series ? Object.keys(data.time_series) : [];
  const gpuTypesFromCustom = customData?.time_series ? Object.keys(customData.time_series) : [];
  const gpuTypes = [...new Set([...gpuTypesFromUsers, ...gpuTypesFromCustom])];

  // Apply axis range from input fields
  const handleApplyAxisRange = () => {
    const newZoomState: Array<{ startValue?: number; endValue?: number }> = [{}, {}, {}, {}];

    // Apply X-axis values
    if (xStartInput) {
      const date = new Date(xStartInput);
      if (!isNaN(date.getTime())) {
        newZoomState[0].startValue = date.getTime();
        newZoomState[2].startValue = date.getTime();
      }
    }
    if (xEndInput) {
      const date = new Date(xEndInput);
      if (!isNaN(date.getTime())) {
        newZoomState[0].endValue = date.getTime();
        newZoomState[2].endValue = date.getTime();
      }
    }

    // Apply Y-axis values
    if (yMinInput) {
      const value = parseFloat(yMinInput) / 1_000_000;
      if (!isNaN(value)) {
        newZoomState[1].startValue = value;
        newZoomState[3].startValue = value;
      }
    }
    if (yMaxInput) {
      const value = parseFloat(yMaxInput) / 1_000_000;
      if (!isNaN(value)) {
        newZoomState[1].endValue = value;
        newZoomState[3].endValue = value;
      }
    }

    setZoomState(newZoomState);
  };

  const renderSearchInput = () => (
    <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "flex-start" }}>
      <Autocomplete
        multiple
        openOnFocus
        filterSelectedOptions
        options={combinedOptions}
        value={selectedOptions}
        onChange={handleOptionSelectionChange}
        inputValue={inputValue}
        onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
        getOptionLabel={(option) => option.label}
        isOptionEqualToValue={(option, value) => option.id === value.id}
        loading={searchLoading}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Contestant Search"
            placeholder="Type to search for contestants"
            size="small"
            slotProps={{
              input: {
                ...params.InputProps,
                endAdornment: (
                  <>
                    {searchLoading ? (
                      <CircularProgress color="inherit" size={20} />
                    ) : null}
                    {params.InputProps.endAdornment}
                  </>
                ),
              },
            }}
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => {
            const { key, ...tagProps } = getTagProps({ index });
            return (
              <Chip
                key={key}
                label={option.label}
                size="small"
                {...tagProps}
              />
            );
          })
        }
        renderOption={(props, option) => {
          const { key, ...restProps } = props;
          return (
            <li key={key} {...restProps}>
              <Typography variant="body2">{option.label}</Typography>
            </li>
          );
        }}
        noOptionsText="No contestants found"
        slotProps={{
          listbox: { style: { maxHeight: 300 } },
        }}
        sx={{ minWidth: 350, flexGrow: 1, maxWidth: 500 }}
      />
      {gpuTypes.length > 0 && (
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>GPU Type</InputLabel>
          <Select
            value={selectedGpuType}
            label="GPU Type"
            onChange={(e) => setSelectedGpuType(e.target.value)}
          >
            {gpuTypes.map((gpuType) => (
              <MenuItem key={gpuType} value={gpuType}>
                {gpuType}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
      {rankings && selectedGpuType && (
        <Button
          variant="outlined"
          size="small"
          onClick={handleReset}
          disabled={resetting}
          sx={{ height: 40 }}
        >
          {resetting ? "Loading..." : " Load Top 5 "}
        </Button>
      )}
      <Box sx={{ display: "flex", flexDirection: "column", ml: 1 }}>
        <FormControlLabel
          control={
            <Switch
              checked={clipOffscreen}
              onChange={(e) => setClipOffscreen(e.target.checked)}
              size="small"
            />
          }
          label="Clip offscreen"
          slotProps={{ typography: { variant: "body2" } }}
        />
        <FormControlLabel
          control={
            <Switch
              checked={showFastestTrend}
              onChange={(e) => setShowFastestTrend(e.target.checked)}
              size="small"
            />
          }
          label="⚡ Fastest (All Users)"
          slotProps={{ typography: { variant: "body2" } }}
        />
      </Box>
        <RadioGroup
          value={displayMode}
          onChange={(e) => setDisplayMode(e.target.value as "all" | "best")}
          sx={{ ml: 1 }}
        >
          <FormControlLabel
            value="all"
            control={<Radio size="small" sx={{ p: 0.5 }} />}
            label="Raw Submissions"
            slotProps={{ typography: { variant: "body2" } }}
          />
          <FormControlLabel
            value="best"
            control={<Radio size="small" sx={{ p: 0.5 }} />}
            label="Best Over Time"
            slotProps={{ typography: { variant: "body2" } }}
          />
        </RadioGroup>
    </Box>
  );

  if (selectedUsers.length === 0 && selectedCustomEntries.length === 0 && !showFastestTrend) {
    return (
      <Box>
        {renderSearchInput()}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={400}
        >
          <Typography color="text.secondary">
            Select users to view their performance trends
          </Typography>
        </Box>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box>
        {renderSearchInput()}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={400}
        >
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        {renderSearchInput()}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={400}
        >
          <Typography color="error">{error}</Typography>
        </Box>
      </Box>
    );
  }

  // When only custom entries are selected, we don't need user data
  const hasUserData = data?.time_series && Object.keys(data.time_series).length > 0;
  const hasCustomSelection = selectedCustomEntries.length > 0;

  if (!hasUserData && !hasCustomSelection && !showFastestTrend) {
    return (
      <Box>
        {renderSearchInput()}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={400}
        >
          <Typography color="text.secondary">
            No data available for selected users
          </Typography>
        </Box>
      </Box>
    );
  }

  // effectiveGpuType is already defined via useMemo at the top of the component
  const gpuData = data?.time_series?.[effectiveGpuType] || {};

  if (Object.keys(gpuData).length === 0 && !hasCustomSelection && !showFastestTrend) {
    return (
      <Box>
        {renderSearchInput()}
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={400}
        >
          <Typography color="text.secondary">
            No {effectiveGpuType} data available for selected users
          </Typography>
        </Box>
      </Box>
    );
  }

  const series: Array<Record<string, unknown>> = [];

  // Calculate global end date (latest submission across all users) for "best" display mode
  let globalEndDate: Date | undefined;
  if (displayMode === "best") {
    let maxTimestamp = 0;

    // Check user data
    Object.values(gpuData).forEach((dataPoints) => {
      dataPoints.forEach((point) => {
        const timestamp = new Date(point.submission_time).getTime();
        if (timestamp > maxTimestamp) {
          maxTimestamp = timestamp;
        }
      });
    });

    // Check custom data
    if (selectedCustomEntries.length > 0 && customData?.time_series?.[effectiveGpuType]) {
      const customGpuData = customData.time_series[effectiveGpuType];
      selectedCustomEntries.forEach((opt) => {
        const model = opt.id.replace("custom_", "");
        const customDataPoints = customGpuData[model];
        if (customDataPoints) {
          customDataPoints.forEach((point) => {
            const timestamp = new Date(point.submission_time).getTime();
            if (timestamp > maxTimestamp) {
              maxTimestamp = timestamp;
            }
          });
        }
      });
    }

    if (maxTimestamp > 0) {
      globalEndDate = new Date(maxTimestamp);
    }
  }

  Object.entries(gpuData).forEach(([userId, dataPoints]) => {
    const sortedData = [...dataPoints].sort(
      (a, b) =>
        new Date(a.submission_time).getTime() -
        new Date(b.submission_time).getTime()
    );

    const displayName = sortedData[0]?.user_name || userId;
    const color = hashStringToColor(userId);

    let chartData = sortedData.map((point) => ({
      value: [
        new Date(point.submission_time).getTime(),
        parseFloat(point.score),
      ] as [number, number],
      gpu_type: point.gpu_type,
      user_name: point.user_name,
      submission_id: point.submission_id,
    }));

    // Apply daily best series if display mode is "best"
    if (displayMode === "best") {
      chartData = toDailyBestSeries(chartData, globalEndDate);
    }

    series.push({
      name: displayName,
      type: "line",
      data: chartData,
      smooth: true,
      symbol: "circle",
      symbolSize: 8,
      lineStyle: {
        width: 2,
        color,
      },
      itemStyle: {
        color,
      },
    });
  });

  // Add custom entry series if selected
  if (selectedCustomEntries.length > 0 && customData?.time_series?.[effectiveGpuType]) {
    const customGpuData = customData.time_series[effectiveGpuType];

    selectedCustomEntries.forEach((opt) => {
      const model = opt.id.replace("custom_", "");
      const customDataPoints = customGpuData[model];
      if (!customDataPoints || customDataPoints.length === 0) return;

      const sortedCustomData = [...customDataPoints].sort(
        (a, b) =>
          new Date(a.submission_time).getTime() -
          new Date(b.submission_time).getTime()
      );

      const displayName = `${CUSTOM_ENTRY_PREFIX} - ${model}`;
      const color = hashStringToColor(`custom_${model}`);

      let chartData = sortedCustomData.map((point) => ({
        value: [
          new Date(point.submission_time).getTime(),
          parseFloat(point.score),
        ] as [number, number],
        gpu_type: point.gpu_type,
        user_name: displayName,
        submission_id: point.submission_id,
      }));

      // Apply daily best series if display mode is "best"
      if (displayMode === "best") {
        chartData = toDailyBestSeries(chartData, globalEndDate);
      }

      series.push({
        name: displayName,
        type: "line",
        data: chartData,
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        lineStyle: {
          width: 2,
          color,
        },
        itemStyle: {
          color,
        },
      });
    });
  }

  // Add fastest trend series if enabled
  if (showFastestTrend && fastestTrendData?.time_series?.[effectiveGpuType]) {
    const fastestGpuData = fastestTrendData.time_series[effectiveGpuType];
    const fastestDataPoints = fastestGpuData.fastest;

    if (fastestDataPoints && fastestDataPoints.length > 0) {
      const sortedFastestData = [...fastestDataPoints].sort(
        (a, b) =>
          new Date(a.submission_time).getTime() -
          new Date(b.submission_time).getTime()
      );

      const displayName = FASTEST_TREND_LABEL;
      const color = "#FFD700"; // Gold color for the fastest trend

      let chartData = sortedFastestData.map((point) => ({
        value: [
          new Date(point.submission_time).getTime(),
          point.score,
        ] as [number, number],
        gpu_type: point.gpu_type,
        user_name: point.user_name,
        record_holder: point.user_name,
        submission_id: point.submission_id,
      }));

      // Apply daily best series if display mode is "best"
      if (displayMode === "best") {
        chartData = toDailyBestSeries(chartData, globalEndDate);
      }

      series.push({
        name: displayName,
        type: "line",
        data: chartData,
        smooth: true,
        symbol: "diamond",
        symbolSize: 10,
        lineStyle: {
          width: 3,
          color,
          type: "solid",
        },
        itemStyle: {
          color,
        },
        z: 10, // Ensure it's drawn on top
      });
    }
  }

  const chartTitle = `Performance Trend (${selectedGpuType})`;

  const filterMode = clipOffscreen ? "filter" as const : "none" as const;

  // Build dataZoom with preserved zoom state
  const dataZoom = [
    {
      type: "inside" as const,
      xAxisIndex: 0,
      filterMode,
      ...(zoomState[0]?.startValue !== undefined && { startValue: zoomState[0].startValue }),
      ...(zoomState[0]?.endValue !== undefined && { endValue: zoomState[0].endValue }),
    },
    {
      type: "inside" as const,
      yAxisIndex: 0,
      filterMode,
      ...(zoomState[1]?.startValue !== undefined && { startValue: zoomState[1].startValue }),
      ...(zoomState[1]?.endValue !== undefined && { endValue: zoomState[1].endValue }),
    },
    {
      type: "slider" as const,
      xAxisIndex: 0,
      filterMode,
      bottom: 40,
      height: 20,
      borderColor: isDark ? "#555" : "#ccc",
      backgroundColor: isDark ? "#333" : "#f5f5f5",
      fillerColor: isDark ? "rgba(100,100,100,0.3)" : "rgba(200,200,200,0.3)",
      handleStyle: {
        color: isDark ? "#888" : "#aaa",
      },
      textStyle: {
        color: textColor,
      },
      ...(zoomState[2]?.startValue !== undefined && { startValue: zoomState[2].startValue }),
      ...(zoomState[2]?.endValue !== undefined && { endValue: zoomState[2].endValue }),
    },
    {
      type: "slider" as const,
      yAxisIndex: 0,
      filterMode,
      right: 10,
      width: 20,
      borderColor: isDark ? "#555" : "#ccc",
      backgroundColor: isDark ? "#333" : "#f5f5f5",
      fillerColor: isDark ? "rgba(100,100,100,0.3)" : "rgba(200,200,200,0.3)",
      handleStyle: {
        color: isDark ? "#888" : "#aaa",
      },
      textStyle: {
        color: textColor,
      },
      ...(zoomState[3]?.startValue !== undefined && { startValue: zoomState[3].startValue }),
      ...(zoomState[3]?.endValue !== undefined && { endValue: zoomState[3].endValue }),
    },
  ];

  const option = {
    title: {
      text: chartTitle,
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
        color: textColor,
      },
    },
    toolbox: {
      feature: {
        dataZoom: {
          yAxisIndex: 0,
          title: { zoom: "Box Zoom", back: "Reset Zoom" },
        },
        restore: { title: "Reset All" },
        saveAsImage: { title: "Save as Image" },
      },
      right: 80,
      top: 10,
      iconStyle: {
        borderColor: textColor,
      },
      emphasis: {
        iconStyle: {
          borderColor: isDark ? "#fff" : "#000",
        },
      },
    },
    tooltip: {
      trigger: "item",
      formatter: (params: { value: [number, number]; data: { gpu_type?: string | null; user_name?: string | null }; seriesName: string }) => {
        const date = new Date(params.value[0]);
        const score = formatMicroseconds(params.value[1]);
        const gpuType = params.data.gpu_type || "Unknown";
        const userName = params.data.user_name || params.seriesName;
        return `
          <strong>${userName}</strong><br/>
          GPU Type: ${gpuType}<br/>
          Time: ${date.toLocaleString()}<br/>
          Score: ${score}
        `;
      },
    },
    legend: {
      data: series.map((s) => s.name),
      bottom: 0,
      textStyle: {
        color: textColor,
      },
    },
    grid: {
      left: "5%",
      right: 60,
      bottom: 100,
      top: "15%",
      containLabel: true,
    },
    xAxis: {
      type: "time",
      name: "Submission Time",
      nameLocation: "middle",
      nameGap: 30,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
      axisLine: {
        lineStyle: {
          color: textColor,
        },
      },
    },
    yAxis: {
      type: "value",
      name: "Score (lower is better)",
      nameLocation: "middle",
      nameGap: 90,
      nameTextStyle: {
        color: textColor,
      },
      axisLabel: {
        color: textColor,
        formatter: (value: number) => `${formatMicrosecondsNum(value)}μs`,
      },
      axisLine: {
        lineStyle: {
          color: textColor,
        },
      },
      splitLine: {
        lineStyle: {
          color: isDark ? "#444" : "#ccc",
        },
      },
    },
    dataZoom,
    series,
  };

  return (
    <Box>
      {renderSearchInput()}
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: 500 }}
        notMerge={false}
        onEvents={chartEvents}
      />
      <Stack direction="row" spacing={2} sx={{ mt: 2, alignItems: "center", flexWrap: "wrap" }}>
        <Typography variant="body2" color="text.secondary">
          X-Axis (Date):
        </Typography>
        <TextField
          label="Start"
          type="date"
          size="small"
          value={xStartInput}
          onChange={(e) => setXStartInput(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 150 }}
        />
        <TextField
          label="End"
          type="date"
          size="small"
          value={xEndInput}
          onChange={(e) => setXEndInput(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ width: 150 }}
        />
        <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
          Y-Axis (μs):
        </Typography>
        <TextField
          label="Min"
          type="number"
          size="small"
          value={yMinInput}
          onChange={(e) => setYMinInput(e.target.value)}
          sx={{ width: 120 }}
        />
        <TextField
          label="Max"
          type="number"
          size="small"
          value={yMaxInput}
          onChange={(e) => setYMaxInput(e.target.value)}
          sx={{ width: 120 }}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleApplyAxisRange}
          sx={{ height: 40 }}
        >
          Apply
        </Button>
      </Stack>
    </Box>
  );
}
