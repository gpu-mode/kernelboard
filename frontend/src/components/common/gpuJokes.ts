// GPU-themed loading jokes
export const gpuJokes = [
  "Waiting for CUDA cores to wake up from their nap...",
  "Stuck in GPU traffic on the PCIe highway...",
  "Memory bandwidth: currently stuck in rush hour...",
  "Tensor cores doing their warm-up stretches...",
  "Kernels compiling... have you tried turning it off and on again?",
  "Synchronizing threads... they're having a meeting...",
  "Loading... unlike my GPU, which is always running hot...",
  "Fetching data at the speed of memory latency...",
  "Please hold, your kernels are important to us...",
  "Allocating VRAM... hope you didn't need that for Chrome tabs...",
  "Coalescing memory accesses... they're forming a union...",
  "Warming up the silicon... results may vary with thermal paste...",
  "Spinning up compute units... they prefer to be called 'processing associates'...",
  "Waiting for warp divergence to resolve its differences...",
  "Fusing operations... it's not as dangerous as it sounds...",
  "Optimizing kernel launch overhead... one day we'll get there...",
  "Checking if the GPU is still mining crypto on the side...",
  "Loading faster than a CPU doing matrix multiplication...",
  "Buffer underrun! Just kidding, we're still loading...",
  "Scheduling workloads... the GPU union requires 15-minute breaks...",
  "Transferring data to device... carrier pigeon en route...",
  "Compiling PTX... please enjoy this hold music: 🎵 beep boop 🎵",
  "Your position in the kernel queue: somewhere behind that AI model...",
  "Reducing memory fragmentation... it's like GPU Tetris...",
  "Prefetching cache lines... they're shy, give them a moment...",
  "Unrolling loops... the GPU yoga instructor insists...",
  "Resolving bank conflicts... the memory banks are negotiating...",
  "Loading at ludicrous speed! (Terms and conditions apply)",
  "Out of VRAM? That's a feature, not a bug...",
  "Vectorizing operations... teaching data to march in formation...",
];

export function getRandomGpuJoke(): string {
  return gpuJokes[Math.floor(Math.random() * gpuJokes.length)];
}
