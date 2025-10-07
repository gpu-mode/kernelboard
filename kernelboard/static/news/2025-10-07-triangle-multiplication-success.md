---
id: triangle-multiplication-success
title: "An Introspective on GPU MODE’s TriMul Competition"
date: 2025-10-07
category: "General"
---

Roughly 3 months ago, interspersed between several larger competitions with [AMD](https://www.datamonsters.com/amd-developer-challenge-2025) and [Jane Street](https://github.com/janestreet-gpu-mode/hackathon), we released the “Triangle Multiplicative Update” kernel writing competition to sample interest in kernel writing outside of the large language model stack. Since the competition has concluded as of last week, we wanted to write a short introspective piece on why we found this particular problem so interesting and what kinds of solutions emerged from it.

This competition was for participants, who, as some would say, did it “*for the love of the game*”. If you’ve been paying attention to or participating in GPU MODE competitions recently, you’ll notice a general trend towards production-ready, large-scale kernels for LLM training and inference. However, there are plenty of domains outside of LLMs that are in dire need of memory-efficient and blazingly fast kernels — biology + ML in particular tends to use domain-specific modules and layers such as the Triangle Multiplicative Update that use disproportionately large amounts of activation memory, and are not cache-friendly when written in PyTorch! We knew that this problem was likely out of the comfort zone for most members of our community, so we were very impressed with the submissions and final results of the competition.

![trimul-winners.png](/static/images/trimul-winners.png)

The rest of this post will be dedicated to an analysis of why this particular problem is quite nasty (and is still a bottleneck in production structure prediction models), as well as a peek into the top submissions by our two winners 🏆, **[Arseni Ivanov](https://arseniivanov.github.io/blog.html) and [David Berard](https://davidberard98.github.io/gpumode-trimul/)**! We also will briefly discuss our ***intended*** solution and how we would have approached the problem, had we participated.

## The Wonderful Participant Writeups ✍🏻

Normally this section would go at the end of the blog, but we wanted to highlight the wonderful writeups created by participants and members of our community. There is a lot of cool and interesting tricks that were discovered over the course of the competition. PS: if you also participated and made a writeup, shoot me ([@a1zhang](https://x.com/a1zhang?lang=en)) a message on X and I’ll add it here!

- 🥇 Arseni Ivanov: [https://arseniivanov.github.io/blog.html](https://arseniivanov.github.io/blog.html)
- 🥇 David Berard: [https://davidberard98.github.io/gpumode-trimul/](https://davidberard98.github.io/gpumode-trimul/)
- Matt Suiche: [https://www.msuiche.com/posts/optimizing-alphafolds-triangle-multiplicative-update-a-first-look-at-gpu-performance-engineering/](https://www.msuiche.com/posts/optimizing-alphafolds-triangle-multiplicative-update-a-first-look-at-gpu-performance-engineering/)

## AlphaFold 2/3’s Triangle Multiplicative Update

The original [AlphaFold2](https://deepmind.google/science/alphafold/) breakthrough that eventually won a Nobel Prize was on solving the structure prediction problem, which is loosely to predict the 3D structure of a protein given its 1D amino acid sequence. One core module in this model is the “Triangle operation”, which computes relationships between *triplets* of points in a sequence, rather than *pairs* as we’re used to in attention. Since then, several companies and labs such as Isomorphic Labs, Bytedance, Chai Discovery, VantAI, and the Boltz team from MIT have all released their own models that rely heavily on these triangle operations.

We took one of the popular layers, the Triangle Multiplicative Update (or TriMul for short), and turned the forward pass for inference into a problem for our leaderboard. In particular, we took **Algorithm 12** from the original paper as the reference implementation that each participant’s kernels have to match. We sampled inputs from both a random normal, as well as a long-tailed distribution — the Cauchy distribution.

![trimul-algo12.png](/static/images/trimul-algo12.png)

**Algorithm 12** roughly translates in PyTorch to:

![trimul-python.png](/static/images/trimul-python.png)

# Line 4
out = einsum('bikh,bjkh->bijh', left, right) # main compute bottleneck
out = self.to_out_norm(out)
out = out * out_gate
```

In plain english, you start with a 4D input tensor of shape `[batch, seq_len, seq_len, hidden_dim]` that is `LayoutRight`. You then form a left and right tensor of the same shape through some normalization and linear transformations + epilogue activations. You compute a big batched matmul between the sequence dimensions of the left/right tensors, then normalize again and apply an output gate. In this algorithm, all normalization and linear layers apply to the last dimension, i.e. `hidden_dim`.

So let’s think a little bit about what’s going on here. Lines 1-3 have dependencies along the `hidden_dim`, which requires extra reads and writes if we chunk along the last dimension (see [LayerNorm implementations](https://triton-lang.org/main/getting-started/tutorials/05-layer-norm.html)). Line 4 *batches* over the hidden dimension, and is essentially a batched matrix multiplication `ik,jk->ij` where both the `batch` and `hidden_dim` are batch dimensions. **However**, notice that the inner dimension `k` is not contiguous in global memory! Then, at the very end, we again have a layer norm over the `hidden_dim`.

**The chunking problem.** The general strategy for kernel writing is to block up your input data smartly to take advantage of repeated accesses to fast memory and/or registers to maximize tensor core (or matrix core for AMD hardware) utilization — then interleave these two operations with warp specialization. In the ideal case, we want to fuse Lines 1-3 with Line 4 while maintaining this strategy as a single persistent kernel.

The issue for fusion in this particular kernel is the dimension(s) that you choose to block in your 4D input tensors will lead to different fusion strategies with different tradeoffs. If we choose to chunk along one of the `seq_len` so that we the `hidden_dim` fits entirely in shared memory, we have to chunk more aggressively across the `seq_len` — when we get to the einsum, which batches across `hidden_dim`, we are forced to use small sequence-level chunks. On the other hand, if we chunk along the `hidden_dim` to get larger `seq_len` chunks, then Lines 1-3 incur a lot of extra overhead from synchronization needed for the LayerNorms!

**The memory layout problem.** The other issue is the memory layout of the input 4D tensors. The layout is particularly nice for Lines 1-3 where the dependencies lie along the contiguous dimension, but if we want memory coalescing for Line 4, we need to be very smart about how we saved our tensors from Lines 1-3, and how we choose to load it for the einsum. Furthermore, after the einsum, we have another LayerNorm with respect to the `hidden_dim`. One trick you can get away with in this competition is to store the output of the einsum in a transposed format — [the top submission by David Berard actually does this](https://davidberard98.github.io/gpumode-trimul/). 

**Sequences of “outgoing” and “incoming” edges (not relevant to leaderboard).** While the aforementioned trick works for this competition, this trick is not a good idea in practice because we hid away some complexity in this problem. The actual Triangle Multiplicative Update is actually two forward passes of **Algorithm 12** in sequence, but the einsum in the second pass is actually swapped to be `ki,kj->ij` instead of `ik,jk->ij`! So you pay the memory cost in the next kernel if you store the output of the first kernel in a transposed way. So over the course of these two layers, there are three different layouts that are “ideal” at different parts of the module.

## Scoring Criteria and Winners 🏆

During the course of the competition, participants could submit to NVIDIA A100, H100, and B200 GPUs, as well as the AMD MI300.

We had two separate scoring / ranking criteria for determining our two winners. The first was the **fastest overall submission across all available GPUs**, which likely meant producing a fast B200 or MI300 solution. The second was the **highest average ranking across all GPUs**, which was computed as:

![trimul-ranking](/static/images/trimul-ranking.png)

⚡ The fastest overall submission was [**David Berard’s B200 kernel**](https://davidberard98.github.io/gpumode-trimul/), which achieved an average speed of 1088.491μs, **8x faster than the reference PyTorch baseline and 2x faster than torch.compile! [[code](https://github.com/davidberard98/gpumode-trimul/blob/main/impl.py)]**

🥇 The participant with the highest average ranking was [**Arseni Ivanov**](https://arseniivanov.github.io/blog.html), who ranked 1st on the A100, 1st on the MI300, 2nd on the B200, and 3rd on the H100! These were extremely impressive and consistent results, and he tuned his kernels to each GPU! [[**code**](https://github.com/arseniivanov/trimul)]

![trimul-water](/static/images/trimul-water.jpg)

Congratulations to the winners David and Arseni, who received one-of-a-kind GPU MODE merch (an $80+ custom water bottle) that not even the organizers own!

## Our Intended Solution + Design Thoughts

We won’t go into too much detail to highlight the participant submissions, but we can provide a little insight into what we were thinking when designing this problem.

**Fusing Lines 1-3 and 4.** We originally tried cleanly fusing these two components but did not find a good way to do so. We settled on ensuring Lines 1-3 were properly fused, and smartly saved their outputs for coalesced loads in Line 4.

**Maximizing shared memory usage.** From profiling the kernel with `ncu`, we found that the kernel was severely memory-bound, even if we were to assume the tensor cores were being fully utilized. We guessed that the top submissions would clean up redundant loads and stores and utilize fast cache memory as much as possible.

**How to tackle the big einsum.** The einsum can be handled without much thought **if** we can get it in the right layout to due a batched matrix multiplication. Funnily enough, we also found it was not a big bottleneck in the kernel if handled properly, despite it being the main computation of the algorithm.

**Datatypes and tolerances.** We purposely set the tolerances to be loose (atol = rtol = 2e-2) to encourage `bf16` and potentially lower solutions. In practice, a lot of SOTA structure prediction models use `bf16` over `tf32` for both training and inference.

**Aside. The long-tailed distributions.** We originally intended the long-tailed distribution inputs to be something that would cause problems for numerically unstable solutions. In his [writeup](https://davidberard98.github.io/gpumode-trimul/), David discusses an issue with these distributions taking long to sample from on CPU, causing unintended timeouts. We temporarily increased timeout tolerances for this competition to compensate for this issue, but we are looking into avoiding this for the future — we apologize for this mistake!

## Top Submissions

We briefly discuss the top solutions and our thoughts on their optimizations. We highly recommend reaching each solution separately to get the full details of how they topped the leaderboard!

![trimul-david](/static/images/trimul-david.png)

**David Berard’s solution. [[writeup](https://davidberard98.github.io/gpumode-trimul/)] [[code](https://github.com/davidberard98/gpumode-trimul/blob/main/impl.py)]** David’s solution is written as a worklog of his changes over time, which can be summarized as follows:

1. Baseline PyTorch with tf32 enabled: **8.61 ms**
2. Persistent matmul kernel to fuse all Linear layers in Lines 1-3: **6.28ms <span style="color:green;">(27% ↓)</span>**
3. Custom LayerNorm for last layer: **4.58ms <span style="color:green;">(47% ↓)</span>**
4. Transposing + Batched MM in Line 4: **2.73ms <span style="color:green;">(68% ↓)</span>**
5. tf32 —> fp16: **1.91ms <span style="color:green;">(77% ↓)</span>**

**Note**: He reported these numbers from his own local tests, which differ slightly from the number reported on our leaderboard.

Perhaps the most surprising thing for me is Step 2, where David found replacing the PyTorch LayerNorm implementation yielded significant improvements. This was also because of the transposition trick described earlier, where the output of the einsum was not saved to be contiguous on the `hidden_dim`. He also suggested that he couldn’t get faster LayerNorm’s working for Lines 1-3 due to the timeout bug, but found good improvements locally!

---

![trimul-arseni](/static/images/trimul-arseni.png)

**Arseni Ivanov’s solution. [[writeup](https://arseniivanov.github.io/blog.html)] [[code](https://github.com/arseniivanov/trimul)]** Arseni’s solution is also written as a worklog of his changes over time, but he took a different approach in tackling this problem. Here, he reports the slowest 🐌 and fastest ⚡ times for two different inputs on an H100. He first starts purely in PyTorch land:

1. Baseline PyTorch: ⚡ 13.9 ms 🐌 14.7 ms
2. Cleaning reference + torch.compile(): ⚡ 10.1 ms 🐌 10.5 ms
3. Changing weights to fp16: ⚡ 8.50 ms 🐌 8.58 ms
4. Stack all Linear layers in Lines 1-3 and do one matmul: ⚡ 6.04 ms 🐌 6.23 ms

Beyond this point, he found it difficult to squeeze any extra performance. Instead, he moved to Triton, and began his optimization process again:

1. Custom matmul / einsum: ⚡ 10.1 ms 🐌 10.2 ms
2. Fused LayerNorm + Linear: ⚡ 9.71 ms 🐌 13.2 ms
3. In stacked linear layer, swizzle outputs to get left/right outputs and the corresponding gates onto the same thread group: ⚡ 9.09 ms 🐌 9.23 ms
4. Stack only left/right + gates to reduce load pressure: ⚡ 8.38 ms 🐌 8.49 ms
5. Construct permuted / transposed outputs in kernel instead of after: ⚡ 4.31 ms 🐌 4.49 ms
6. torch.compile() over new Triton functions: ⚡ 3.27 ms 🐌 3.46 ms
7. Tuning per arch: ⚡ 3.27 ms 🐌 3.46 ms

This entire worklog is extremely interesting because it’s not at all what we had thought of originally. A lot of the complexity lies in working around the big “stacked linear layer” trick he discovered in (3) of the PyTorch-only optimizations, in how to now compute the element-wise operators as an epilogue for each output after this giant fused linear stack. This was a super cool read, and I’m actually quite interested to see if Arseni’s solution can be combined with David’s given how different they are!

## Final Thoughts

We honestly had no idea if anyone would participate in this competition — it was an obscure kernel for most deep learning practitioners, and we didn’t have the huge prize pool we normally have when partnering with companies. This problem has a special place in my heart because I first met Mark and Matej in the GPU MODE discord while writing a [Triton kernel for the MSA Pair Weighted Averaging algorithm](https://github.com/Ligo-Biosciences/AlphaFold3), which is another important kernel used in AlphaFold3. We were all pleasantly surprised with the depth of the solutions and the writeups, and we hope to share and launch more problems like these in the future 😁.

Thanks to everyone for participating, and we hope to see you at the GPU MODE IRL#2 event later this month!

— az