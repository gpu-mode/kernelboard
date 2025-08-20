import { Box, Card, CardContent, styled, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { useEffect } from "react";
import { fetchLeaderBoard } from "../../api/api";
import { fetcherApiCallback } from "../../lib/hooks/useApi";
import { toDateUtc } from "../../lib/date/utils";
import RankingsList from "./components/RankingLists";
import CodeBlock from "../../components/codeblock/CodeBlock";
import { ErrorAlert } from "../../components/alert/ErrorAlert";
import { useParams } from "react-router-dom";
import Loading from "../../components/common/loading";
import { ConstrainedContainer } from "../../components/app-layout/ConstrainedContainer";

export const CardTitle = styled(Typography)(({ theme }) => ({
  fontSize: "1.5rem",
  fontWeight: "bold",
}));

export default function Leaderboard() {
  const { id } = useParams<{ id: string }>();
  const { data, loading, error, errorStatus, call } =
    fetcherApiCallback(fetchLeaderBoard);

  useEffect(() => {
    if (!id) {
      return;
    }
    call(id);
  }, [id]);

  if (loading) {
    return <Loading />;
  }

  // handles specific error
  if (error) {
    return <ErrorAlert status={errorStatus} message={error} />;
  }

  const descriptionText = (text: string) => {
    return (
      <Typography component="div" sx={{ whiteSpace: "pre-line" }}>
        {text}
      </Typography>
    );
  };

  const toDeadlineUTC = (raw: string) => {
    const formatted = toDateUtc(raw);
    return `ended (${formatted}) UTC`;
  };
  const info_items = [
    { title: "Deadline", content: <span>{toDeadlineUTC(data.deadline)}</span> },
    { title: "Language", content: <span>{data.lang}</span> },
    {
      title: "GPU types",
      content: <span>{data.gpu_types.join(", ")}</span>,
    },
  ];

  return (
    <ConstrainedContainer>
      <Box>
        <h1>{data.name}</h1>
        <Grid container spacing={2} marginBottom={2}>
          {info_items.map((info, idx) => (
            <Grid size={{ xs: 12, md: 4 }} key={idx}>
              <Card>
                <CardContent>
                  <CardTitle>{info.title}</CardTitle>
                  {info.content}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        <Grid marginBottom={2}>
          <Card>
            <CardContent>
              <CardTitle fontWeight="bold">Description</CardTitle>
              {descriptionText(data.description)}
            </CardContent>
          </Card>
        </Grid>
        <Card>
          <CardContent>
            <CardTitle fontWeight="bold">Reference Implementation </CardTitle>
            <Box>
              <CodeBlock code={data.reference} />
            </Box>
          </CardContent>
        </Card>
        <Box>
          <RankingsList rankings={data.rankings} />
        </Box>
      </Box>
    </ConstrainedContainer>
  );
}
