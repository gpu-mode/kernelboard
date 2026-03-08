import { Box, Typography, Link, Chip } from "@mui/material";
import type { Theme } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { fetchEvents, DiscordEvent } from "../../api/api";
import Loading from "../../components/common/loading";

const styles = {
  container: {
    maxWidth: "900px",
    margin: "0 auto",
    padding: "24px",
  },
  section: {
    marginBottom: "32px",
  },
  sectionTitle: {
    fontSize: "1.5rem",
    fontWeight: 600,
    marginBottom: "16px",
    borderBottom: "2px solid",
    borderColor: "divider",
    paddingBottom: "8px",
  },
  card: {
    marginBottom: "16px",
    padding: "16px",
    backgroundColor: "action.hover",
    borderRadius: "8px",
    border: "1px solid",
    borderColor: "divider",
  },
  cardTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: "4px",
  },
  cardMeta: {
    color: "text.secondary",
    marginBottom: "8px",
    fontSize: "0.9rem",
  },
  cardDescription: {
    marginBottom: "8px",
    color: "text.primary",
  },
  link: {
    color: "primary.main",
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },
  archiveBox: {
    backgroundColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(33, 150, 243, 0.08)" : "#e3f2fd",
    padding: "16px",
    borderRadius: "8px",
    marginTop: "32px",
    border: "1px solid",
    borderColor: (theme: Theme) =>
      theme.palette.mode === "dark" ? "rgba(144, 202, 249, 0.3)" : "#90caf9",
  },
  intro: {
    marginBottom: "24px",
    lineHeight: 1.6,
  },
  noEvents: {
    color: "text.secondary",
    fontStyle: "italic",
    padding: "16px",
    backgroundColor: "action.hover",
    borderRadius: "8px",
  },
  chipContainer: {
    display: "flex",
    gap: "8px",
    marginBottom: "8px",
  },
};

interface InPersonEvent {
  title: string;
  date: string;
  location: string;
  lumaUrl: string;
  description?: string;
}

interface Competition {
  title: string;
  startDate: string;
  endDate: string;
  location: string;
  lumaUrl: string;
  description?: string;
}

// Edit these lists to add/remove events

const inPersonEvents: InPersonEvent[] = [
  {
    title: "GPU MODE x Diffusion Meetup",
    date: "2026-03-11",
    location: "San Francisco, California",
    lumaUrl: "https://luma.com/gpumodexdiffusion",
  },
  {
    title: "PyTorch Helion Hackathon",
    date: "2026-03-14",
    location: "San Francisco, CA",
    lumaUrl: "https://cerebralvalley.ai/e/helion-hackathon",
  },
  {
    title: "SemiAnalysis x FluidStack Hackathon",
    date: "2026-03-15",
    location: "San Jose, CA",
    lumaUrl: "https://luma.com/SAxFSHack",
  },
  {
    title: "NVFP4 Award Ceremony at GTC",
    date: "2026-03-16",
    location: "San Jose, CA",
    lumaUrl: "https://luma.com/blast/reo09yXX6p",
  },
];

const kernelCompetitions: EventItem[] = [
  {
    title: "The $1.1M AMD x GPU MODE - E2E Model Speedrun",
    startDate: "2026-03-06",
    endDate: "2026-03-30",
    location: "Online",
    lumaUrl: "https://luma.com/cqq4mojz",
  },
  {
    title: "Blackwell NVFP4 Kernel Hackathon",
    startDate: "2025-11-03",
    endDate: "2026-02-20",
    location: "Online",
    lumaUrl: "https://lu.ma/9n27uem4",
    description: "Build fast NVFP4 kernels for Blackwell GPUs.",
  },
];

function formatDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatEventDateTime(isoString: string): string {
  const date = new Date(isoString);
  return (
    date.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }) +
    " at " +
    date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    })
  );
}

function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getDurationDays(startDate: string, endDate: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function isOngoing(startDate: string, endDate: string): boolean {
  const now = new Date();
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  return now >= start && now <= end;
}

function isEventUpcoming(event: DiscordEvent): boolean {
  const now = new Date();
  // Use end time if available, otherwise use start time
  const eventEnd = event.scheduled_end_time
    ? new Date(event.scheduled_end_time)
    : new Date(event.scheduled_start_time);
  return eventEnd >= now;
}

function InPersonEventCard({ event }: { event: InPersonEvent }) {
  const today = isOngoing(event.date, event.date);

  return (
    <Box sx={styles.card}>
      <Box sx={styles.chipContainer}>
        {today ? (
          <Chip label="Today" size="small" color="success" />
        ) : (
          <Chip label="Upcoming" size="small" color="info" />
        )}
      </Box>
      <Typography sx={styles.cardTitle}>{event.title}</Typography>
      <Typography sx={styles.cardMeta}>
        {formatDate(event.date)} · {event.location}
      </Typography>
      {event.description && (
        <Typography sx={styles.cardDescription}>
          {event.description}
        </Typography>
      )}
      <Link
        href={event.lumaUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={styles.link}
      >
        Learn More
      </Link>
    </Box>
  );
}

function CompetitionCard({ event }: { event: Competition }) {
  const ongoing = isOngoing(event.startDate, event.endDate);
  const duration = getDurationDays(event.startDate, event.endDate);

  return (
    <Box sx={styles.card}>
      <Box sx={styles.chipContainer}>
        {ongoing ? (
          <Chip label="Ongoing" size="small" color="success" />
        ) : (
          <Chip label="Upcoming" size="small" color="info" />
        )}
      </Box>
      <Typography sx={styles.cardTitle}>{event.title}</Typography>
      <Typography sx={styles.cardMeta}>
        {formatDate(event.startDate)} - {formatDate(event.endDate)} ({duration}{" "}
        days) · {event.location}
      </Typography>
      {event.description && (
        <Typography sx={styles.cardDescription}>
          {event.description}
        </Typography>
      )}
      <Link
        href={event.lumaUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={styles.link}
      >
        Learn More
      </Link>
    </Box>
  );
}

function LectureCard({ event }: { event: DiscordEvent }) {
  return (
    <Box sx={styles.card}>
      <Typography sx={styles.cardTitle}>{event.name}</Typography>
      <Typography sx={styles.cardMeta}>
        {formatEventDateTime(event.scheduled_start_time)}
      </Typography>
      {event.description && (
        <Typography sx={styles.cardDescription}>{event.description}</Typography>
      )}
      <Link
        href={event.event_url}
        target="_blank"
        rel="noopener noreferrer"
        sx={styles.link}
      >
        View on Discord (Add to Calendar)
      </Link>
    </Box>
  );
}

export default function Lectures() {
  const [events, setEvents] = useState<DiscordEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEvents()
      .then((data) => {
        // Filter out past events
        const upcomingEvents = data.filter(isEventUpcoming);
        setEvents(upcomingEvents);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch events:", err);
        setError("Failed to load upcoming lectures");
        setLoading(false);
      });
  }, []);

  const now = new Date();
  const activeInPerson = inPersonEvents.filter(
    (e) => parseLocalDate(e.date) >= now,
  );
  const activeCompetitions = kernelCompetitions.filter(
    (e) => parseLocalDate(e.endDate) >= now,
  );

  return (
    <Box sx={styles.container}>
      <Typography variant="h4" sx={{ marginBottom: "24px", fontWeight: 600 }}>
        Events
      </Typography>

      <Typography sx={styles.intro}>
        GPU MODE hosts in-person events, kernel competitions, and lectures
        featuring experts in GPU programming.
      </Typography>

      {/* In Person Events Section */}
      <Box sx={styles.section}>
        <Typography sx={styles.sectionTitle}>In Person Events</Typography>
        {activeInPerson.length === 0 ? (
          <Typography sx={styles.noEvents}>
            No in-person events currently scheduled. Check back soon!
          </Typography>
        ) : (
          activeInPerson.map((event) => (
            <InPersonEventCard key={event.title} event={event} />
          ))
        )}
      </Box>

      {/* Kernel Competitions Section */}
      <Box sx={styles.section}>
        <Typography sx={styles.sectionTitle}>Kernel Competitions</Typography>
        {activeCompetitions.length === 0 ? (
          <Typography sx={styles.noEvents}>
            No kernel competitions currently running. Check back soon!
          </Typography>
        ) : (
          activeCompetitions.map((event) => (
            <CompetitionCard key={event.title} event={event} />
          ))
        )}
      </Box>

      {/* Upcoming Lectures Section */}
      <Box sx={styles.section}>
        <Typography sx={styles.sectionTitle}>Upcoming Lectures</Typography>
        <Typography
          sx={{
            color: "text.secondary",
            fontSize: "0.875rem",
            marginBottom: "16px",
          }}
        >
          Lectures are pulled live from our Discord server. For the most
          up-to-date schedule, join the{" "}
          <Link
            href="https://discord.gg/gpumode"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ color: "primary.main" }}
          >
            GPU MODE Discord
          </Link>
          .
        </Typography>
        {loading ? (
          <Loading />
        ) : error ? (
          <Typography sx={styles.noEvents}>{error}</Typography>
        ) : events.length === 0 ? (
          <Typography sx={styles.noEvents}>
            No upcoming lectures scheduled. Check back soon or join our Discord
            to stay updated!
          </Typography>
        ) : (
          events.map((event) => <LectureCard key={event.id} event={event} />)
        )}
      </Box>

      {/* Archive Link */}
      <Box sx={styles.archiveBox}>
        <Typography sx={{ fontWeight: 600, marginBottom: "8px" }}>
          Lecture Archive
        </Typography>
        <Typography sx={{ marginBottom: "8px" }}>
          Browse all past lectures and tutorials on our YouTube channel.
        </Typography>
        <Link
          href="https://www.youtube.com/@GPUMODE"
          target="_blank"
          rel="noopener noreferrer"
          sx={styles.link}
        >
          Visit GPU MODE YouTube Channel
        </Link>
      </Box>
    </Box>
  );
}
