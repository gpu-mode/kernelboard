import {
  Tooltip,
  Typography,
  type SxProps,
  type Theme,
  type TypographyVariant,
} from "@mui/material";
import React, { useEffect, useRef, useState } from "react";

interface Props {
  text: string;
  variant?: TypographyVariant;
}

const styles = {
  mouseIcon: (showTooltip: boolean) => ({
    cursor: showTooltip ? "pointer" : "default",
  }),
};

// EllipsisWithTooltip: auto show tooltip with full string if it's truncated by nowrap
export const EllipsisWithTooltip: React.FC<Props> = ({
  text,
  variant = "body2",
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (el) {
      setShowTooltip(el.scrollWidth > el.clientWidth);
    }
  }, [text]);

  return (
    <Tooltip title={text} disableHoverListener={!showTooltip}>
      <Typography
        ref={ref}
        variant={variant}
        noWrap
        component="div"
        sx={styles.mouseIcon(showTooltip)}
      >
        {text}
      </Typography>
    </Tooltip>
  );
};
