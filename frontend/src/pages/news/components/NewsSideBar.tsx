import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { EllipsisWithTooltip } from "../../../components/common/EllipsisWithTooltip";

const styles = {
  sidebar: {
    position: "sticky",
    top: 80,
    alignSelf: "flex-start",
    height: "calc(100vh - 150px)",
    overflowY: "auto",
    borderRight: "1px solid #ddd",
    width: "20vw",
    minWidth: 200,
    maxWidth: 300,
    px: 2,
    flexShrink: 0,
  },
};
export function Sidebar({
  data,
  scrollTo,
}: {
  data: any[];
  scrollTo: (id: string, smooth?: boolean) => void;
}) {
  const navigate = useNavigate();
  return (
    <Box sx={styles.sidebar} data-testid="news-sidbar">
      <Typography variant="h6" mb={1} noWrap>
        News
      </Typography>
      <List dense>
        {data.map((item) => (
          <ListItemButton
            key={item.id}
            component="a"
            href={`/v2/news/${item.id}`}
            onClick={(e) => {
              // If user is trying to open in new tab/window (ctrl/meta/shift/alt)
              // or using a non-left mouse button, allow default browser behavior.
              // Otherwise prevent default and perform SPA smooth-scroll + navigate.
              // e.nativeEvent is a MouseEvent with `button` property.
              const me = e as React.MouseEvent<HTMLAnchorElement>;
              const isModified = me.ctrlKey || me.metaKey || me.shiftKey || me.altKey || (me.nativeEvent && (me.nativeEvent as any).button !== 0);
              if (isModified) return;
              e.preventDefault();
              // smooth scroll to the section
              scrollTo(item.id, true);
              // navigate to /news/:postId and mark origin so News can avoid
              // an immediate jump (we already started a smooth scroll).
              navigate(`/news/${item.id}`, { state: { fromSidebar: true } });
            }}
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
