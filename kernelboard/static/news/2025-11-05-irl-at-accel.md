---
id: irl-at-accel
title: "GPU MODE IRL at Accel (again)"
date: 2025-11-05
category: "General"
---

3 events (Accel, NVIDIA, Jane Street); 2 $100k kernel competitions with AMD; [21k Discord members](http://discord.gg/gpumode); [23K youtube subscribers with 83 lectures](https://www.youtube.com/@GPUMODE/videos) and [10 active working groups](https://docs.google.com/document/d/1LprkfyOP5cRtv7rwkFiEHx2XEKhtwf9J4bQkD6btzgo/edit?tab=t.0) later, GPU MODE hosted its final IRL event of the year in collaboration with [Accel](https://www.accel.com/), at their San Francisco office.  Nebius sponsored the event, generously providing both 215 B200 GPUs and $28k worth of prizes for the top 4 teams.

#### The Hackathon
The hackathon was open ended, with the 170 participants coming to the hackathon idea ready, or brainstorming with other participants and mentors *(see [here](https://docs.google.com/document/d/1LpG90Huio5xX0OIrDdusBsmwKJkdV0lFTKMAfgd4_QU/edit?tab=t.0) for ideas [Daniel](https://github.com/danielhanchen) (one of the judges) shared with participants)*. The theme this year was on distributed GPUs for training, post training and inference, and winners were chosen based on how likely their contribution would lead to a successful OSS project.  As an example, at last year’s IRL, influential projects like [llm.c](https://github.com/karpathy/llm.c) (which later inspired llm.q) & [KernelBench](https://github.com/ScalingIntelligence/KernelBench) (which started research around Kernel LLMs) emerged. The 2024 winners produced [No libtorch PyTorch binaries](https://github.com/lianakoleva/no-libtorch-compile) (a prototype used to inspire PyTorch native runtime), [Flex CUTLASS](https://github.com/GindaChen/FlexFlashAttention3) and [TCCL](https://github.com/mcrl/tccl) (which started an explosion of comms libraries).

**A tremendous thanks** to the speakers [William Fedus](https://x.com/liamfedus), [Edward Yang](https://github.com/ezyang) and [Adam Peske](https://x.com/apaszke); the judges [Tianqi Chen](https://tqchen.com/), [Edward Yang](https://github.com/ezyang), [Daniel Han](https://github.com/danielhanchen) and [Mark Saroufim](https://x.com/marksaroufim?lang=en); and the TAs [Horace He](https://github.com/chillee), [Amir Afzali](https://github.com/amirafzali), [Vincent Moens](https://github.com/vmoens), [Aleksa Gordic](https://github.com/gordicaleksa), [Benjamin Chetioui](https://github.com/bchetioui), [Daniel Vega-Myhre](https://github.com/danielvegamyhre), [Hicham Badri](https://github.com/mobicham), [Tristan Rice](https://github.com/d4l3k) and [Alban Desmaisons](https://github.com/alband), all without whom this would not have been possible.

<figure>
  <img src="/static/images/accel_irl_hacking.jpg" alt="Hackers in the zone" />
  <figcaption>Hackers in the zones</figcaption>
</figure>
<figure>
  <img src="/static/images/accel_irl_mark.jpg" alt="Wisdom from Mark" />
  <figcaption>Wisdom from Mark </figcaption>
</figure>

#### The Winners
Congratulations to the winners for impressive ideas executed in the span of <6 hours, and for coming top out of 22 submissions!

**1st place - Symmetric Minds** ([slides](https://docs.google.com/presentation/d/1CR_y31b0cOUZvMn60x3nDFURsK-vvrK7HUK3Jch2NPw/edit?usp=sharing) | [PR 1](https://github.com/vllm-project/vllm/pull/27495) [PR 2](https://github.com/triton-lang/triton/commit/3c2e6f87d63e51b657e755d8965b5632233260b7))
They observed that PyTorch’s symmetric memory abstraction is a convenient mechanism for supporting multi-GPU kernels, yet it has not been widely adopted in vLLM. To address this gap, they refined Triton’s multi-GPU expert-parallel communication kernels and implemented a symmetric memory pool, enabling seamless integration of these kernels into vLLM for high-performance MoE communication. Additionally, they performed detailed performance profiling across execution phases, modules, and operators in vLLM to identify and resolve bottlenecks. With CUDA graphs enabled, their implementation achieved a ~1.5× end-to-end speedup over the DeepEP baseline for GPT-OSS-20B MoE inference in vLLM on two GB200 GPUs.

![Team Symmetric Minds](/static/images/symmetric_minds.png)

**2nd Place -  Flash Hogs** ([Github](https://github.com/marcelroed/flash-hob/))
Flash-HOG is an optimized kernel for running higher order gradient methods (HOG) for attention on NVIDIA Blackwell. Their kernel implements the backward pass of attention. Many research-level and current SoTA architectures depend on XLA to produce a kernel for this operation, and having an efficient kernel opens this approach up to wider use. They built a fast flash-attention-inspired kernel using the complex equation that emerges when doing the calculus for this expression, which required carefully planning what memory to read and write when, and how to do tiling and recomputation across keys and values. The kernel is close to 3 times longer than the flash attention backward, and requires twice as many passes, and the algorithm cannot be found or pattern-matched by any existing high-level compilers. Their final kernel is ~3x faster at all sizes than an XLA-optimized reference kernel, and has linear memory cost as opposed to the XLA kernel's quadratic cost. They validate kernel correctness and benchmark it for sizes up to 1M token context length.

![Team Flash Hogs](/static/images/flash_hogs.png)

**3rd Place -  Delta Net** ([slides](https://docs.google.com/presentation/d/1jbnLmjBv8TqMsBHFmAbBOZuOpyObYIOPBk55LovIKIw/edit?usp=sharing) | [Github](https://github.com/garrett361/flash-linear-attention/tree/cp-gdn))
Delta Net developed a Context-Parallel (CP) implementation for the core mechanism of the popular Gated DeltaNet (GDN) architecture, unlocking the ability to scale the architecture to extremely long sequence lengths during both training and inference. Using their implementation, they incorporated a 8B hybrid GDN-Transformer model into the popular torchtitan training repo and demonstrated the ability to train on context lengths of up to 128k (at least) using context-parallelism on a single GB200 node.

![Team Delta Net](/static/images/delta_net.png)

**4th Place - KernelEvolve** ([slides](https://docs.google.com/presentation/d/1lCnQtn6q8FckOsCdMwdAJi1rK3XCYY4e8r2xqUttAfg/edit?slide=id.p#slide=id.p))
KernelEvolve, combines AlphaEvolve-style LLM search with an RL loop to auto-tune Helion GPU kernels. This slashes Helion’s traditional multi-hour autotuning runs down to under 30 minutes while preserving correctness. The agent iteratively proposes kernel variants, benchmarks them for speed and accuracy, and feeds the top configs back into Helion’s search space for rapid convergence. With live results and an open RL environment on Prime Intellect, the project showcases how LLMs combined with RL can generate optimized drop-in kernels for the PyTorch codebase. This points toward a future where AI-accelerated tooling continuously co-designs high-performance GPU operators for the broader ML community.

![Team KernelEvolve](/static/images/kernel_evolve.png)

#### GPU MODE & friends
GPU MODE is kicking off [one more kernel competition for the year in collaboration with NVIDIA](https://luma.com/9n27uem4?tk=DgX4O6). Join the [Discord](https://discord.gg/gpumode) and look out for the announcements and competitions as we continue to grow the community. 🚀
