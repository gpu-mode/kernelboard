import { Box, Typography } from "@mui/material";

export default function ErrorPage({
  code,
  title,
  description,
}: {
  code: number;
  title: string;
  description: string;
}) {
  return (
    <Box maxWidth="md">
      <Box
        sx={{
          marginTop: "5vh",
          minHeight: "20vh",
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-start",
          px: 4,
        }}
      >
        <Box sx={{ flex: 1 }}>
          <Typography
            sx={{
              fontSize: { xs: "1rem", sm: "2rem" },
              fontWeight: "bold",
              color: "text.primary",
            }}
          >
            {code}. {title}
          </Typography>
          <Typography
            variant="body1"
            sx={{ mt: 2, maxWidth: 600, color: "text.secondary" }}
          >
            {description}
          </Typography>
        </Box>
        <Box
          component="img"
          src="/static/images/kernelbot-sad.png"
          alt="Sad Bunny"
          sx={{
            width: { xs: 160, sm: 180 },
            height: "auto",
          }}
        />
      </Box>
    </Box>
  );
}
