import React from "react";
import { Box, type SxProps, type Theme } from "@mui/material";
import { toColor } from "../../lib/utils/color";

interface ColoredSquareProps {
  /**
   * The name/text to generate a color from
   */
  name: string;
  /**
   * Size of the square in pixels (default: 16px)
   */
  size?: number;
  /**
   * Additional sx props for customization
   */
  sx?: SxProps<Theme>;
}

/**
 * ColoredSquare component that generates a colored square based on a name.
 */
export const ColoredSquare: React.FC<ColoredSquareProps> = ({
  name,
  size = 16,
  sx = {},
}) => {
  const backgroundColor = toColor(name);

  const squareStyles: SxProps<Theme> = {
    width: size,
    height: size,
    borderRadius: 1,
    display: "inline-block",
    marginRight: 1,
    backgroundColor,
    verticalAlign: "baseline",
    flexShrink: 0,
    ...sx,
  };

  return <Box sx={squareStyles} />;
};

export default ColoredSquare;
