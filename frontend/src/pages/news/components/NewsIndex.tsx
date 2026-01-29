import { Box, Typography, Card, CardActionArea, CardContent } from "@mui/material";
import { useNavigate } from "react-router-dom";

interface NewsItem {
  id: string;
  title: string;
  date: string;
  category: string;
  markdown: string;
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    px: 3,
    py: 2,
  },
  card: {
    mb: 2,
    "&:hover": {
      boxShadow: 3,
    },
  },
};

function getExcerpt(markdown: string, maxLength: number = 150): string {
  // Remove markdown formatting and get first bit of text
  const plainText = markdown
    .replace(/#{1,6}\s+/g, "") // headers
    .replace(/\*\*|__/g, "") // bold
    .replace(/\*|_/g, "") // italic
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "") // images
    .replace(/`{1,3}[^`]*`{1,3}/g, "") // code
    .replace(/\n+/g, " ") // newlines
    .trim();

  if (plainText.length <= maxLength) return plainText;
  return plainText.slice(0, maxLength).trim() + "...";
}

export function NewsIndex({ data }: { data: NewsItem[] }) {
  const navigate = useNavigate();

  return (
    <Box sx={styles.container}>
      <Typography variant="h4" gutterBottom>
        News and Announcements
      </Typography>
      {data.map((item) => (
        <Card key={item.id} sx={styles.card} variant="outlined">
          <CardActionArea onClick={() => navigate(`/news/${item.id}`)}>
            <CardContent>
              <Typography variant="h6" component="h2">
                {item.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                {item.date}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
                {getExcerpt(item.markdown)}
              </Typography>
            </CardContent>
          </CardActionArea>
        </Card>
      ))}
    </Box>
  );
}
