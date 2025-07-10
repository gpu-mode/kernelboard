---
id: amd-competition-success
title: "AMD Competition Success: 30K+ Submissions and Recognition at Advancing AI"
date: 2025-06-12
category: "AMD Competition Results"
---

We are thrilled to share that GPU MODE was recognized on stage by Dr Lisa Su at the [Advancing AI](https://www.amd.com/en/corporate/events/advancing-ai.html) closing ceremony, where she said "I wanted to thank the GPU MODE team formed by talented developers from Meta, Hugging Face and MIT, they have been great partners throughout and we could not have done this without them." Back when GPU MODE was just a humble reading group, we never imagined we would be recognized on stage by one of the greatest CEO's of our time.

![Lisa Su recognizing GPU MODE at Advancing AI](/static/images/lisa.jpeg)
*We were missing the giga cracked Erik (ngc92)*

Our team built the infrastructure for the [AMD $100K kernel competition](https://www.datamonsters.com/amd-developer-challenge-2025), which ran for 2 months and saw remarkable participation: over 30,000 submissions from 163+ teams. This volume exceeds the total number of kernels collected in [KernelBook](https://huggingface.co/datasets/GPUMODE/KernelBook) from crawling all of Github and this represents a significant milestone in aggregating higher quality kernel data.

The results have been outstanding – the best competition kernels are faster than AMD's AITER baselines, all implemented in single files. It was an absolute pleasure meeting some of the top teams in person including Seb, hatoo, Snektron and the grand prize winners ColorsWind.

You can see the full results [here](https://www.gpumode.com/).

Several top competitors have generously shared their techniques:

- [ColorsWind's Grand Prize Winning Kernel](https://github.com/ColorsWind/AMD-Developer-Challenge-2025)
- [Luong The Cong's FP8 Quant MatMul](https://github.com/luongthecong123/fp8-quant-matmul)
- [Seb V's Fast GPU Matrix Implementation](https://seb-v.github.io/optimization/update/2025/01/20/Fast-GPU-Matrix-multiplication.html)
- [Akash Karnatak's Challenge Solutions](https://akashkarnatak.github.io/amd-challenge/)
- [Fan Wenjie Technical Analysis](https://www.bilibili.com/read/cv41954307/?opus_fallback=1)
- [Snektron's FP8 Matrix Multiplication](https://github.com/Snektron/gpumode-amd-fp8-mm)

We're planning to release all submissions as a permissively licensed dataset, with each solution representing unique tradeoffs between usability and performance. We're working closely with ROCm engineers to upstream the best kernels to PyTorch, leveraging its position as the premier distribution vehicle for kernels.

In exciting academic news, our KernelBot platform has been accepted to the ICML CodeML workshop with two strong accepts! Reviewer #2 highlighted the virtuous loop we created:
> "The paper presents KernelBot, a platform for hosting code optimization competitions, specifically for GPU kernels. Users can submit their implementations and let the system rank them. This serves to (i) educate users how to write efficient GPU kernels, (ii) improve the efficiency of existing GPU kernels, and (iii) collect high quality data for GPU programs that can be used to train generative models."

A big thank you to everyone who was involved in [Popcorn](https://gpu-mode.github.io/popcorn/) for inspiration, [discord.gg/gpumode](https://discord.gg/gpumode) community and of course our amazing collaborators at AMD for making this possible.
