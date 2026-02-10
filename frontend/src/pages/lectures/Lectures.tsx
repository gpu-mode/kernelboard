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

type HackathonType = "in-person" | "digital";

interface Hackathon {
  title: string;
  type: HackathonType;
  startDate: string;
  endDate: string;
  location: string;
  lumaUrl: string;
  description?: string;
}

// Edit this list to add/remove hackathons
const hackathons: Hackathon[] = [
  {
    title: "Blackwell NVFP4 Kernel Hackathon",
    type: "digital",
    startDate: "2025-11-03",
    endDate: "2026-02-20",
    location: "Online",
    lumaUrl: "https://lu.ma/9n27uem4",
    description: "Build fast NVFP4 kernels for Blackwell GPUs.",
  },
];

function formatDate(dateString: string): string {
  const date = new Date(dateString);
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

function getDurationDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function isOngoing(startDate: string, endDate: string): boolean {
  const now = new Date();
  const start = new Date(startDate);
  const end = new Date(endDate);
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

function HackathonCard({ hackathon }: { hackathon: Hackathon }) {
  const ongoing = isOngoing(hackathon.startDate, hackathon.endDate);
  const duration = getDurationDays(hackathon.startDate, hackathon.endDate);

  return (
    <Box sx={styles.card}>
      <Box sx={styles.chipContainer}>
        <Chip
          label={hackathon.type === "in-person" ? "In-Person" : "Digital"}
          size="small"
          color={hackathon.type === "in-person" ? "primary" : "secondary"}
        />
        {ongoing && <Chip label="Ongoing" size="small" color="success" />}
      </Box>
      <Typography sx={styles.cardTitle}>{hackathon.title}</Typography>
      <Typography sx={styles.cardMeta}>
        {formatDate(hackathon.startDate)} - {formatDate(hackathon.endDate)} (
        {duration} days) · {hackathon.location}
      </Typography>
      {hackathon.description && (
        <Typography sx={styles.cardDescription}>
          {hackathon.description}
        </Typography>
      )}
      <Link
        href={hackathon.lumaUrl}
        target="_blank"
        rel="noopener noreferrer"
        sx={styles.link}
      >
        Register on Luma
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

  const activeHackathons = hackathons.filter((h) =>
    isOngoing(h.startDate, h.endDate),
  );

  return (
    <Box sx={styles.container}>
      <Typography variant="h4" sx={{ marginBottom: "24px", fontWeight: 600 }}>
        Events & Lectures
      </Typography>

      <Typography sx={styles.intro}>
        GPU MODE hosts hackathons, lectures, and events featuring experts in GPU
        programming.
      </Typography>

      {/* Hackathons Section */}
      <Box sx={styles.section}>
        <Typography sx={styles.sectionTitle}>Hackathons</Typography>
        {activeHackathons.length === 0 ? (
          <Typography sx={styles.noEvents}>
            No hackathons currently running. Check back soon!
          </Typography>
        ) : (
          activeHackathons.map((hackathon) => (
            <HackathonCard key={hackathon.title} hackathon={hackathon} />
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
