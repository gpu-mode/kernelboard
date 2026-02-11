import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import {
  Box,
  Typography,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { fetchAiTrend, type AiTrendResponse } from "../../../api/api";
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
    hash = hash & hash;
  }

  const hue = Math.abs(hash) % 360;
  const saturation = 65 + (Math.abs(hash >> 8) % 20);
  const lightness = 45 + (Math.abs(hash >> 16) % 15);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export default function AiTrendChart({ leaderboardId }: AiTrendChartProps) {
  const [data, setData] = useState<AiTrendResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedGpuType, setSelectedGpuType] = useState<string>("");
  const resolvedMode = useThemeStore((state) => state.resolvedMode);
  const isDark = resolvedMode === "dark";
  const textColor = isDark ? "#e0e0e0" : "#333";

  const gpuTypes = data?.time_series ? Object.keys(data.time_series) : [];

  useEffect(() => {
    if (gpuTypes.length > 0 && !selectedGpuType && data?.time_series) {
      // Find the GPU type with the most unique users with successful submissions
      let maxUniqueUsers = 0;
      let defaultGpuType = gpuTypes[0];

      for (const gpuType of gpuTypes) {
        const gpuData = data.time_series[gpuType];
        if (gpuData) {
          // Collect unique user IDs across all models for this GPU type
          const uniqueUserIds = new Set<string>();
          for (const model of Object.keys(gpuData)) {
            const dataPoints = gpuData[model];
            dataPoints.forEach((point) => {
              if (point.user_id) {
                uniqueUserIds.add(point.user_id);
              }
            });
          }

          if (uniqueUserIds.size > maxUniqueUsers) {
            maxUniqueUsers = uniqueUserIds.size;
            defaultGpuType = gpuType;
          }
        }
      }

      setSelectedGpuType(defaultGpuType);
    }
  }, [gpuTypes, selectedGpuType, data?.time_series]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchAiTrend(leaderboardId);
        setData(result);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [leaderboardId]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (
    !data ||
    !data.time_series ||
    Object.keys(data.time_series).length === 0
  ) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <Typography color="text.secondary">No AI data available</Typography>
      </Box>
    );
  }

  const selectedData = selectedGpuType ? data.time_series[selectedGpuType] : null;
  if (!selectedData || Object.keys(selectedData).length === 0) {
    return (
      <Box>
        <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="gpu-type-select-label">GPU Type</InputLabel>
            <Select
              labelId="gpu-type-select-label"
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
        </Box>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight={400}
        >
          <Typography color="text.secondary">
            No {selectedGpuType || "AI"} data available
          </Typography>
        </Box>
      </Box>
    );
  }

  // Build series for ECharts
  const series: any[] = [];

  Object.entries(selectedData).forEach(([model, dataPoints]) => {
    const color = hashStringToColor(model);

    const sortedData = [...dataPoints].sort(
      (a, b) =>
        new Date(a.submission_time).getTime() -
        new Date(b.submission_time).getTime()
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

  const option = {
    title: {
      text: `AI Model Performance Trend (${selectedGpuType})`,
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
      data: Object.keys(selectedData),
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
      <Box sx={{ mb: 2, display: "flex", justifyContent: "flex-end" }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel id="gpu-type-select-label">GPU Type</InputLabel>
          <Select
            labelId="gpu-type-select-label"
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
      </Box>
      <ReactECharts option={option} style={{ height: 500 }} />
    </Box>
  );
}
