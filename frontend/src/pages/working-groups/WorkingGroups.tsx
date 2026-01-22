import { Box, Typography, Link } from "@mui/material";

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
    borderBottom: "2px solid #eee",
    paddingBottom: "8px",
  },
  projectCard: {
    marginBottom: "24px",
    padding: "16px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    border: "1px solid #eee",
  },
  projectTitle: {
    fontSize: "1.1rem",
    fontWeight: 600,
    marginBottom: "8px",
  },
  projectDescription: {
    marginBottom: "8px",
    color: "#333",
  },
  projectLink: {
    color: "#1976d2",
    textDecoration: "none",
    "&:hover": {
      textDecoration: "underline",
    },
  },
  intro: {
    marginBottom: "24px",
    lineHeight: 1.6,
  },
  highlight: {
    backgroundColor: "#fff3cd",
    padding: "12px 16px",
    borderRadius: "6px",
    marginBottom: "24px",
    border: "1px solid #ffc107",
  },
  governance: {
    backgroundColor: "#e3f2fd",
    padding: "16px",
    borderRadius: "8px",
    marginTop: "32px",
    border: "1px solid #90caf9",
  },
};

interface Project {
  name: string;
  description: string;
  link?: string;
  note?: string;
}

const activeProjects: Project[] = [
  {
    name: "Project Popcorn",
    description:
      "Building a superhuman GPU kernel programmer. We are especially looking for contributions in evaluation infrastructure.",
    link: "https://gpu-mode.github.io/popcorn/",
  },
  {
    name: "Robotics VLA",
    description:
      "A group to learn about using Vision Language Action models to do robotics in the real world.",
  },
  {
    name: "Factorio Learning Environment",
    description:
      "A really hard environment to test the capabilities of the best models.",
    link: "https://github.com/JackHopkins/factorio-learning-environment",
  },
  {
    name: "PPC Course",
    description:
      "An online course on performance with tons of excellent exercises and a leaderboard!",
    link: "https://ppc-exercises.cs.aalto.fi/course/aalto2025/contest",
  },
  {
    name: "Singularity Zero to Hero",
    description:
      "A minimal reimplementation of PyTorch built in Rust. Looking for help across building models, compiler and the language.",
    link: "https://j4orz.ai/sctp/",
  },
  {
    name: "Triton Puzzles",
    description: "Puzzles for learning Triton.",
    link: "https://github.com/srush/Triton-Puzzles",
  },
];

const customerSupportProjects: Project[] = [
  {
    name: "Reasoning-Gym",
    description:
      "A collection of RL environments to test the capabilities of AGI systems.",
    link: "https://github.com/open-thought/reasoning-gym",
  },
  {
    name: "ThunderKittens",
    description:
      "Tile primitives in C++, easy to use, tiny library that doesn't get in your way.",
    link: "https://github.com/HazyResearch/ThunderKittens",
  },
  {
    name: "torchao",
    description:
      "PyTorch native quantization library. Development now happens primarily on GitHub and there is a lot of interest in acceleration of MX formats on newer NVIDIA and AMD hardware.",
    link: "https://github.com/pytorch/ao",
  },
  {
    name: "HQQ",
    description:
      "A very fast dynamic quantization algorithm. For quantization related projects on GPU MODE, I suggest you hear what gauge-nernst, mobicham and drisspg have to say on the server.",
    link: "https://mobiusml.github.io/hqq_blog/",
  },
  {
    name: "TileLang",
    description: "A domain specific DSL that's super fast.",
    link: "https://github.com/tile-ai/tilelang",
  },
  {
    name: "Helion",
    description: "A domain specific DSL that autotunes everything.",
    link: "https://github.com/pytorch/helion",
  },
];

const kernelDSLChannels: Project[] = [
  {
    name: "CUTLASS",
    description:
      "NVIDIA's CUDA Templates for Linear Algebra Subroutines. A collection of highly efficient CUDA C++ templates for matrix operations. More recently also including CuteDSL",
    link: "https://github.com/NVIDIA/cutlass",
  },
  {
    name: "ThunderKittens",
    description:
      "Tile primitives in C++, easy to use, tiny library that doesn't get in your way.",
    link: "https://github.com/HazyResearch/ThunderKittens",
  },
  {
    name: "Triton / Gluon",
    description:
      "OpenAI's Triton language for writing highly efficient GPU kernels. Gluon is the frontend for Triton.",
    link: "https://github.com/triton-lang/triton",
  },
  {
    name: "Helion",
    description:
      "A domain specific DSL that autotunes everything. Built on top of Triton.",
    link: "https://github.com/pytorch/helion",
  },
  {
    name: "CuTile",
    description:
      "NVIDIA's tile abstraction library for writing efficient GPU kernels.",
    link: "https://github.com/NVIDIA/cutile-python",
  },
];

const pastProjects: Project[] = [
  {
    name: "llm.c",
    description:
      "A full pretraining loop in raw CUDA. Authors all went on to do great things.",
    link: "https://github.com/karpathy/llm.c",
  },
  {
    name: "Liger",
    description:
      "Triton kernels for pretraining. Authors predominantly joined various AGI labs.",
    link: "https://github.com/linkedin/Liger-Kernel",
  },
  {
    name: "Ring-Attention",
    description:
      "Minimal reimplementation of the ring attention algorithm. Initial POC was completed.",
    link: "https://github.com/gpu-mode/ring-attention",
  },
  {
    name: "TCCL",
    description:
      "Written at the GPU Mode hackathon, collective implementations in Triton. Key ideas are now pushed harder in triton-distributed.",
    link: "https://github.com/cchan/tccl",
  },
  {
    name: "Triton-viz",
    description:
      "A visualization of Triton code. Rumors are this will become active again soon.",
    link: "https://github.com/Deep-Learning-Profiling-Tools/triton-viz",
  },
];

function ProjectCard({ project }: { project: Project }) {
  return (
    <Box sx={styles.projectCard}>
      <Typography sx={styles.projectTitle}>{project.name}</Typography>
      <Typography sx={styles.projectDescription}>
        {project.description}
      </Typography>
      {project.link && (
        <Link
          href={project.link}
          target="_blank"
          rel="noopener noreferrer"
          sx={styles.projectLink}
        >
          {project.link}
        </Link>
      )}
      {project.note && (
        <Typography
          sx={{ marginTop: "8px", fontStyle: "italic", color: "#666" }}
        >
          {project.note}
        </Typography>
      )}
    </Box>
  );
}

export default function WorkingGroups() {
  return (
    <Box sx={styles.container}>
      <Typography variant="h4" sx={{ marginBottom: "24px", fontWeight: 600 }}>
        Working Groups
      </Typography>

      <Typography sx={styles.intro}>
        This page aggregates current and past working groups in GPU MODE.
        Working groups are effectively open source projects built in the open on
        some existing channel on GPU MODE so they welcome new and experienced
        contributors. However, you need some level of agency to be successful at
        contributing.
      </Typography>

      <Box sx={styles.highlight}>
        <Typography sx={{ fontWeight: 500 }}>
          We are always open to new working groups and we can help arrange compute
        </Typography>
      </Box>

      <Box sx={styles.section}>
        <Typography sx={styles.sectionTitle}>Active Working Groups</Typography>
        {activeProjects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </Box>

      <Box sx={styles.section}>
        <Typography sx={styles.sectionTitle}>
          Customer Support Channels
        </Typography>
        {customerSupportProjects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </Box>

      <Box sx={styles.section}>
        <Typography sx={styles.sectionTitle}>
          Kernel DSL Customer Support Channels
        </Typography>
        <Typography sx={{ marginBottom: "16px", color: "#666" }}>
          Get help and support for popular kernel development DSLs and
          libraries.
        </Typography>
        {kernelDSLChannels.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </Box>

      <Box sx={styles.section}>
        <Typography sx={styles.sectionTitle}>Past Working Groups</Typography>
        {pastProjects.map((project) => (
          <ProjectCard key={project.name} project={project} />
        ))}
      </Box>

      <Box sx={styles.governance}>
        <Typography sx={{ fontWeight: 600, marginBottom: "8px" }}>
          Governance
        </Typography>
        <Typography>
          Mark Saroufim is BDFL. The two main
          moderators are Alex Zhang and Matej Sirovatka.
        </Typography>
      </Box>
    </Box>
  );
}
