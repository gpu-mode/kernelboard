---
id: amd-second-competition
title: "AMD's Second Kernel Competition"
date: 2025-11-06
category: "General"
---

> *These teams achieved up to 1.5x AMDs internal performance baseline – an impressive testament to what’s possible through open collaboration.*
 [*-Quote from AMD AI Dev Day*](https://www.amd.com/en/developer/resources/technical-articles/2025/inside-amd-ai-devday-2025.html)

Following our [first AMD kernel competition](https://www.youtube.com/watch?v=npHuhPEt6xc) that ended in June, GPU Mode has once again partnered with AMD on a virtual kernel competition to develop and optimize multi-GPU communication kernels, achieving significant performance gains in LLM models, and ultimately pushing the limits of inference performance on AMD MI300X GPUs. As part of the competition, AMD sponsored the compute resources with 40 MI300X GPUs, and put forth a total prize pool of $150,000 for the top 4 submissions.

The competition, which ran from August 30th to October 13th, 2025, had 600+ developers who submitted 60,000 kernels, building a massive database of open source kernels to support [Project Popcorn](https://gpu-mode.github.io/popcorn/), whose aim is to develop LLMs capable of authoring kernels at expert human level. For reference, the previous kernel competition with AMD yielded 40,000 kernels, meaning that submissions went up 50% in this second competition, and the two competitions cumulatively helped collect a 100,000 kernel dataset, which is 5x the publicly available permissively licensed [kernel datasets](https://huggingface.co/datasets/GPUMODE/KernelBook) on the entirity GitHub.

The three kernel problems introduced in this competition were:
- [Single node 8x GPU All-to-All kernel for Mixture-of-Experts](https://www.gpumode.com/v2/leaderboard/563?tab=rankings)
- [Single node 8x GPU GEMM + ReduceScatter kernel](https://www.gpumode.com/v2/leaderboard/564?tab=rankings)
- [Single node 8x GPU AllGather + GEMM kernel](https://www.gpumode.com/v2/leaderboard/565?tab=rankings)

These are critical kernels for modern LLM workloads, since they collectively enable dynamic token routing between experts, while leveraging tensor parallelism. Having these kernels optimized helps scaling LLM workloads without requiring significant increases in compute.

Each kernel had a reference implementation using standard PyTorch distributed primitives, and participants had to maintain numerical correctness while improving performance. The scoring metric for the leaderboard was the absolute runtime/speed of the participant’s kernel averaged over a large set of test cases – where shape information was provided for the test cases, but the input data itself was sampled from a random distribution.

For the grand prize, the kernel that delivered the highest performance closest to the published roofline achieved up to 1.5x AMD's internal performance baseline – an impressive testament to what’s possible through open collaboration.

Some detailed write-ups from the participants:
- [gau.nerst on all2all](https://gau-nernst.github.io/amd-a2a/)
- [yotta on all 3 problems](https://www.yottalabs.ai/post/optimizing-distributed-inference-kernels-for-amd-developer-challenge-2025)

As done previously, all 60,000 kernel submissions  will be released with a permissive license. We are also working with Hugging Face to distribute the best kernels on their kernels project.

Learn more from this [wonderful blog from AMD](https://www.amd.com/en/developer/resources/technical-articles/2025/inside-amd-ai-devday-2025.html)
