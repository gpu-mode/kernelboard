import { useEffect, useState } from "react";
import ReactECharts from "echarts-for-react";
import { Box, Typography, CircularProgress } from "@mui/material";
import { fetchAiTrend, type AiTrendResponse } from "../../../api/api";
import {
  formatMicrosecondsNum,
  formatMicroseconds,
} from "../../../lib/utils/ranking";

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

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await fetchAiTrend(leaderboardId);
        setData(result);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load AI trend data",
        );
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

  // For now, only render H100 data
  const h100Data = data.time_series["H100"];
  if (!h100Data || Object.keys(h100Data).length === 0) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={400}
      >
        <Typography color="text.secondary">
          No H100 AI data available
        </Typography>
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

  const option = {
    title: {
      text: "AI Model Performance Trend (H100)",
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
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
      axisLabel: {
        formatter: (value: number) => {
          const date = new Date(value);
          return `${date.getMonth() + 1}/${date.getDate()}`;
        },
      },
    },
    yAxis: {
      type: "value",
      name: "Score (lower is better)",
      nameLocation: "middle",
      nameGap: 70,
      axisLabel: {
        formatter: (value: number) => `${formatMicrosecondsNum(value)}μs`,
      },
    },
    series,
  };

  return (
    <Box>
      <ReactECharts option={option} style={{ height: 500 }} />
    </Box>
  );
}
