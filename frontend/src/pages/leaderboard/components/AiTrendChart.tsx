import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
  IconButton,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import {
  fetchAiTrend,
  fetchUserTrend,
  type AiTrendResponse,
} from "../../../api/api";
import {
  formatMicrosecondsNum,
  formatMicroseconds,
} from "../../../lib/utils/ranking";
import { useThemeStore } from "../../../lib/store/themeStore";

interface AiTrendChartProps {
  leaderboardId: string;
}

// Generate a consistent color from a string using hash
function hashStringToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32bit integer
  }

  // Generate HSL color with good saturation and lightness for visibility
  const hue = Math.abs(hash) % 360;
  const saturation = 65 + (Math.abs(hash >> 8) % 20); // 65-85%
  const lightness = 45 + (Math.abs(hash >> 16) % 15); // 45-60%

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default function AiTrendChart({ leaderboardId }: AiTrendChartProps) {
  const [data, setData] = useState<AiTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isDark = resolvedMode === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";

  useEffect(() => {
    loadData();
  }, [leaderboardId]);

  const handleSearch = () => {
    if (userInput.trim()) {
      loadData(userInput.trim());
    }
  };

  const handleClear = () => {
    setUserInput("");
    loadData();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  const renderSearchInput = () => (
    <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
      <TextField
        size="small"
        placeholder="User IDs (comma-separated)"
        value={userInput}
        onChange={(e) => setUserInput(e.target.value)}
        onKeyPress={handleKeyPress}
        sx={{ width: 280 }}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              {userInput && (
                <IconButton size="small" onClick={handleClear}>
                  <ClearIcon fontSize="small" />
                </IconButton>
              )}
              <IconButton size="small" onClick={handleSearch}>
                <SearchIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />
      {searchedUser && (
        <Typography variant="body2" color="text.secondary">
          Showing: {searchedUser}
        </Typography>
      )}
    </Box>
  );

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
            {searchedUser ? "No data available for this user" : "No AI data available"}
          </Typography>
        </Box>
      </Box>
    );
  }

  // For now, only render H100 data
  const h100Data = data.time_series["H100"];
  if (!h100Data || Object.keys(h100Data).length === 0) {
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
            {searchedUser ? "No H100 data available for this user" : "No H100 AI data available"}
          </Typography>
        </Box>
      </Box>
    );
  }

  // Build series for ECharts
  const series: any[] = [];

  Object.entries(h100Data).forEach(([model, dataPoints]) => {
    const color = hashStringToColor(model);

    const sortedData = [...dataPoints].sort(
      (a, b) =>
        new Date(a.submission_time).getTime() -
        new Date(b.submission_time).getTime(),
    );

    series.push({
      name: model,
      type: "line",
      data: sortedData.map((point) => ({
        value: [
          new Date(point.submission_time).getTime(),
          parseFloat(point.score),
        ],
        gpu_type: point.gpu_type,
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

  const chartTitle = searchedUser
    ? `Performance Trend (H100) - ${searchedUser}`
    : "AI Model Performance Trend (H100)";

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
        return `
          <strong>${params.seriesName}</strong><br/>
          GPU Type: ${gpuType}<br/>
          Time: ${date.toLocaleString()}<br/>
          Score: ${score}
        `;
      },
    },
    legend: {
      data: Object.keys(h100Data),
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
