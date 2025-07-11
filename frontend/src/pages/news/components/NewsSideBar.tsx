import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { EllipsisWithTooltip } from "../../../components/common/EllipsisWithTooltip/EllipsisWithTooltip";

const styles = {
  sidebar: {
    position: "sticky",
    top: 80,
    alignSelf: "flex-start",
    height: "calc(100vh - 200px)",
    overflowY: "auto",
    borderRight: "1px solid #ddd",
    width: 300,
    px: 2,
    flexShrink: 0,
  },
};
export function Sidebar({
  data,
  scrollTo,
}: {
  data: any[];
  scrollTo: (id: string) => void;
}) {
  return (
    <Box sx={styles.sidebar} data-testid="news-sidbar">
      <Typography variant="h6" mb={1} noWrap>
        News
      </Typography>
      <List dense>
        {data.map((item) => (
          <ListItemButton
            key={item.id}
            onClick={() => scrollTo(item.id)}
            title={item.title}
            data-testid={`news-sidbar-button-${item.id}`}
          >
            <ListItemText
              primary={
                <EllipsisWithTooltip text={item.title} variant="body2" />
              }
              secondary={item.date}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );
}
