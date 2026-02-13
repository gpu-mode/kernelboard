import { useEffect, useState, useCallback } from "react";
import ReactECharts from "echarts-for-react";
import {
  Box,
  Typography,
  CircularProgress,
  Autocomplete,
  TextField,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
} from "@mui/material";
import {
  fetchUserTrend,
  fetchCustomTrend,
  searchUsers,
  type UserTrendResponse,
  type CustomTrendResponse,
  type UserSearchResult,
} from "../../../api/api";

// Display name prefix for custom (KernelAgent) entries
const CUSTOM_ENTRY_PREFIX = "KernelAgent";

// Simple option type - custom entries are identified by id starting with "custom_" to avoid collisions
interface TrendOption {
  id: string;
  label: string;
}
import {
  formatMicrosecondsNum,
  formatMicroseconds,
} from "../../../lib/utils/ranking";
import { useThemeStore } from "../../../lib/store/themeStore";

interface RankingEntry {
  user_name: string;
  score: number;
  file_name?: string;
  submission_id?: number;
}

interface UserTrendChartProps {
  leaderboardId: string;
  defaultUsers?: Array<{ userId: string; username: string }>;
  defaultGpuType?: string | null;
  rankings?: Record<string, RankingEntry[]>;
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

export default function UserTrendChart({ leaderboardId, defaultUsers, defaultGpuType, rankings }: UserTrendChartProps) {
  const [data, setData] = useState<UserTrendResponse | null>(null);
  const [customData, setCustomData] = useState<CustomTrendResponse | null>(null);
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
      } catch (err: any) {
        setError(err.message || "Failed to load data");
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
    _event: any,
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
    </Box>
  );

  if (selectedUsers.length === 0 && selectedCustomEntries.length === 0) {
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

  if (!hasUserData && !hasCustomSelection) {
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

  // Use user data GPU type or fall back to first available AI GPU type
  const effectiveGpuType = selectedGpuType || gpuTypes[0] || "";
  const gpuData = data?.time_series?.[effectiveGpuType] || {};

  if (Object.keys(gpuData).length === 0 && !hasCustomSelection) {
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

  const series: any[] = [];

  Object.entries(gpuData).forEach(([userId, dataPoints]) => {
    const sortedData = [...dataPoints].sort(
      (a, b) =>
        new Date(a.submission_time).getTime() -
        new Date(b.submission_time).getTime()
    );

    const displayName = sortedData[0]?.user_name || userId;
    const color = hashStringToColor(userId);

    series.push({
      name: displayName,
      type: "line",
      data: sortedData.map((point) => ({
        value: [
          new Date(point.submission_time).getTime(),
          parseFloat(point.score),
        ],
        gpu_type: point.gpu_type,
        user_name: point.user_name,
      })),
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

      series.push({
        name: displayName,
        type: "line",
        data: sortedCustomData.map((point) => ({
          value: [
            new Date(point.submission_time).getTime(),
            parseFloat(point.score),
          ],
          gpu_type: point.gpu_type,
          user_name: displayName,
        })),
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

  const chartTitle = `Performance Trend (${selectedGpuType})`;

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
    tooltip: {
      trigger: "item",
      formatter: (params: any) => {
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
      right: "4%",
      bottom: "15%",
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
    series,
  };

  return (
    <Box>
      {renderSearchInput()}
      <ReactECharts option={option} style={{ height: 500 }} notMerge={true} />
    </Box>
  );
}
