import { Box, Card, CardContent, Typography, Stack, Chip } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";
import MarkdownRenderer from "../../../../components/markdown-renderer/MarkdownRenderer";

interface BenchmarkShape {
  name: string;
  dims: unknown[];
}

interface ChallengeDescriptionPanelProps {
  title: string;
  description: string;
  benchmarkShapes?: BenchmarkShape[];
  isDesktop: boolean;
  height?: string;
}

export function ChallengeDescriptionPanel({
  title,
  description,
  benchmarkShapes,
  isDesktop,
  height,
}: ChallengeDescriptionPanelProps) {
  return (
    <Card
      sx={{
        height: isDesktop ? height ?? "calc(100vh - 200px)" : "auto",
        overflow: "auto",
      }}
    >
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
          <EmojiEventsIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            {title}
          </Typography>
        </Stack>

        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
          Challenge Description
        </Typography>

        <MarkdownRenderer content={description} />

        {benchmarkShapes && benchmarkShapes.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Benchmark Shapes
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1}>
              {benchmarkShapes.map((shape, idx) => (
                <Chip
                  key={idx}
                  label={`${shape.name}: ${JSON.stringify(shape.dims)}`}
                  size="small"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}
