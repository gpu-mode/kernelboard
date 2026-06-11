import { Box, Link, Typography } from "@mui/material";

const sections = [
  {
    title: "Data We Collect",
    body: (
      <>
        <Typography>
          KernelBot may collect the following information when you interact with
          it:
        </Typography>
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3 }}>
          <li>Discord user ID</li>
          <li>Discord username or display name</li>
          <li>Discord server ID</li>
          <li>competition name or problem ID</li>
          <li>selected GPU type or hardware target</li>
          <li>submitted source code files</li>
          <li>
            submission metadata, such as timestamps, benchmark results, runtime,
            score, and leaderboard placement
          </li>
          <li>
            command arguments or interaction data needed to process a submission
          </li>
        </Box>
        <Typography sx={{ mt: 2 }}>
          KernelBot does not intentionally collect unrelated private messages or
          general Discord conversation history.
        </Typography>
      </>
    ),
  },
  {
    title: "How We Use Data",
    body: (
      <>
        <Typography>We use this data to:</Typography>
        <Box component="ul" sx={{ mt: 1, mb: 0, pl: 3 }}>
          <li>run GPU kernel competitions</li>
          <li>evaluate and benchmark submitted code</li>
          <li>display competition results and leaderboards</li>
          <li>debug, audit, and improve the competition platform</li>
          <li>publish competition submissions and results as an open dataset</li>
        </Box>
      </>
    ),
  },
  {
    title: "Public Release of Submissions",
    body: (
      <>
        <Typography>
          Submissions to KernelBot competitions may be publicly released.
        </Typography>
        <Typography sx={{ mt: 2 }}>
          This includes submitted source code, problem metadata, GPU target
          information, benchmark results, scores, and related competition
          metadata.
        </Typography>
        <Typography sx={{ mt: 2 }}>
          Public releases may be made through the GPU MODE Hugging Face dataset:{" "}
          <Link href="https://huggingface.co/datasets/GPUMODE/kernelbot-data">
            https://huggingface.co/datasets/GPUMODE/kernelbot-data
          </Link>
        </Typography>
        <Typography sx={{ mt: 2 }}>
          Submissions may be released under an open license, including Creative
          Commons Attribution 4.0 International, also known as CC BY 4.0, or
          another open license specified on the dataset page.
        </Typography>
        <Typography sx={{ mt: 2 }}>
          Do not submit code, files, secrets, credentials, private data,
          proprietary code, or confidential information that you do not want to
          be made public.
        </Typography>
      </>
    ),
  },
  {
    title: "Data Sharing",
    body: (
      <>
        <Typography>
          We may share or publish competition data publicly as part of open
          datasets, leaderboard results, research artifacts, benchmark reports,
          or competition archives.
        </Typography>
        <Typography sx={{ mt: 2 }}>We do not sell personal data.</Typography>
        <Typography sx={{ mt: 2 }}>
          We do not use submitted message content, code, or files to train
          machine learning or AI models unless this is separately disclosed for
          a specific competition or dataset release.
        </Typography>
      </>
    ),
  },
  {
    title: "Data Storage",
    body: (
      <>
        <Typography>
          Competition data may be stored outside Discord on infrastructure used
          by GPU MODE or KernelBot, including databases, benchmark systems,
          logs, object storage, GitHub, Hugging Face, or other services used to
          operate and publish the competition.
        </Typography>
        <Typography sx={{ mt: 2 }}>
          We keep data as long as needed to operate competitions, maintain
          public datasets, preserve leaderboard history, debug issues, and
          support reproducibility.
        </Typography>
      </>
    ),
  },
  {
    title: "User Choices",
    body: (
      <>
        <Typography>
          Participation in KernelBot competitions is voluntary.
        </Typography>
        <Typography sx={{ mt: 2 }}>
          If you do not want your code or submission metadata to be processed,
          benchmarked, stored, or publicly released, do not submit it to
          KernelBot.
        </Typography>
        <Typography sx={{ mt: 2 }}>
          If you believe you accidentally submitted private, confidential, or
          sensitive information, contact us as soon as possible. We may not be
          able to remove data that has already been publicly released, copied,
          downloaded, forked, cached, or redistributed by others.
        </Typography>
      </>
    ),
  },
  {
    title: "Contact",
    body: (
      <Typography>
        For questions or removal requests, contact:{" "}
        <Link href="mailto:mark@gpumode.com">mark@gpumode.com</Link>
      </Typography>
    ),
  },
  {
    title: "Changes",
    body: (
      <Typography>
        We may update this Privacy Policy from time to time. Updated versions
        will be posted at the same location or otherwise made available through
        KernelBot documentation, the bot profile, or competition rules.
      </Typography>
    ),
  },
];

export default function Privacy() {
  return (
    <Box
      sx={{
        maxWidth: "900px",
        margin: "0 auto",
        px: 3,
        py: 2,
      }}
    >
      <Typography variant="h3" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
        KernelBot Privacy Policy
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 4 }}>
        Last updated: June 11, 2026
      </Typography>
      <Typography sx={{ mb: 2 }}>
        KernelBot is a Discord bot used to run competitive GPU kernel
        programming competitions for GPU MODE.
      </Typography>
      <Typography sx={{ mb: 4 }}>
        By using KernelBot or submitting code to a KernelBot competition, you
        agree that your submission may be collected, processed, benchmarked,
        displayed, and publicly released as part of the competition.
      </Typography>
      {sections.map((section) => (
        <Box component="section" key={section.title} sx={{ mb: 4 }}>
          <Typography
            variant="h5"
            component="h2"
            sx={{
              fontWeight: 600,
              mb: 2,
              pb: 1,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            {section.title}
          </Typography>
          {section.body}
        </Box>
      ))}
    </Box>
  );
}
