import styled from "@emotion/styled";
import { Box, Container } from "@mui/material";

export const flexRowCenter = {
  display: "flex",
  alignItems: "center",
  gap: 0.5,
};

export const flexRowCenterMediumGap = {
  display: "flex",
  alignItems: "center",
  gap: 5,
};

export const mediumText = {
  fontSize: "1.25rem",
};

export const PageBox = styled(Container)(({ theme }) => ({
  maxWidth: "lg",
  mt: 4,
  ml: 4,
}));
