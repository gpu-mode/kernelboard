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
} from "@mui/material";
import {
  fetchUserTrend,
  searchUsers,
  type UserTrendResponse,
  type UserSearchResult,
} from "../../../api/api";
import {
  formatMicrosecondsNum,
  formatMicroseconds,
} from "../../../lib/utils/ranking";
import { useThemeStore } from "../../../lib/store/themeStore";

interface UserTrendChartProps {
  leaderboardId: string;
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

export default function UserTrendChart({ leaderboardId }: UserTrendChartProps) {
  const [data, setData] = useState<UserTrendResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedGpuType, setSelectedGpuType] = useState<string>("");
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isDark = resolvedMode === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";

  const [selectedUsers, setSelectedUsers] = useState<UserSearchResult[]>([]);
  const [userOptions, setUserOptions] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");

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
        // Set default GPU type to the first available
        const gpuTypes = Object.keys(result.time_series || {});
        if (gpuTypes.length > 0 && !gpuTypes.includes(selectedGpuType)) {
          setSelectedGpuType(gpuTypes[0]);
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

  // Search users when input changes
  useEffect(() => {
    const searchTimeout = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const limit = inputValue === "" ? 5 : 20;
        const result = await searchUsers(leaderboardId, inputValue, limit);
        setUserOptions(result.users);
      } catch (err) {
        console.error("Failed to search users:", err);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [inputValue, leaderboardId]);

  const handleUserSelectionChange = (
    _event: any,
    newValue: UserSearchResult[]
  ) => {
    setSelectedUsers(newValue);
    const userIds = newValue.map((u) => u.user_id);
    loadData(userIds);
  };

  const gpuTypes = data?.time_series ? Object.keys(data.time_series) : [];

  const renderSearchInput = () => (
    <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "flex-start" }}>
      <Autocomplete
          multiple
          openOnFocus
          options={userOptions}
        value={selectedUsers}
        onChange={handleUserSelectionChange}
        inputValue={inputValue}
        onInputChange={(_event, newInputValue) => setInputValue(newInputValue)}
        getOptionLabel={(option) => option.username}
        isOptionEqualToValue={(option, value) =>
          option.user_id === value.user_id
        }
        loading={searchLoading}
        renderInput={(params) => (
          <TextField
            {...params}
            label="Search users"
            placeholder="Type to search users..."
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
                label={option.username}
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
              <Typography variant="body2">{option.username}</Typography>
            </li>
          );
        }}
        noOptionsText="No users found"
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
    </Box>
  );

  if (selectedUsers.length === 0) {
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

  if (
    !data ||
    !data.time_series ||
    Object.keys(data.time_series).length === 0
  ) {
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

  const gpuData = data.time_series[selectedGpuType];
  if (!gpuData || Object.keys(gpuData).length === 0) {
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
            No {selectedGpuType} data available for selected users
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

  const chartTitle = `User Performance Trend (${selectedGpuType})`;

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
      left: "3%",
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
      nameGap: 70,
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
      <ReactECharts option={option} style={{ height: 500 }} />
    </Box>
  );
}
