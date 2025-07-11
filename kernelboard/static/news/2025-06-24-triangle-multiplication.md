---
id: triangle-multiplication
title: "New competition problem: Triangle Multiplicative Update"
date: 2025-06-24
category: "Triangle Multiplicative"
---

We are excited to announce a really exciting and challenging GPU competition problem on the GPU MODE leaderboard that you can optimize across NVIDIA (A100, H100, B200) and AMD hardware (MI300)! This is our first problem across multiple hardware vendors, and is also particularly challenging ([@a1zhang](https://x.com/a1zhang) has been particularly excited about it for months). You will be optimizing the **Triangle Multiplicative Update kernel** from the landmark [AlphaFold2/3](https://deepmind.google/science/alphafold/) line of work that won a Nobel Prize! Here is the **official problem writeup**: [https://tinyurl.com/gpumode-trimul](https://tinyurl.com/gpumode-trimul)

Funnily enough, while writing up this problem, we noticed that NVIDIA actually released that they had been working on this kernel in their cuEquivariance library — what a coincidence! We ask that participants do not use this library in their solutions, as it is closed source (we will be automatically and manually removing these solutions on the leaderboard). Honestly though, I’m confident that you all can easily beat their solution!

![New competition problem: Triangle Multiplicative Update](/static/images/trimul_teaser.png)

**Why a BioML kernel?**
A lot of the kernels / problems you will see in these GPU MODE kernel writing competitions center around large language model training — our last competition, for example, centered around popular single-device kernels used in DeepSeek-V3/R1. Many future problems may also revolve around communication kernels where we provide a whole node such as the expert parallelism MoE.

![](/static/images/google.png)

However, many of these kernels we have in mind have already been heavily optimized by experts in labs like DeepSeek, OpenAI, Anthropic, Google DeepMind, etc. so we wanted to design some problems that were still interesting, but had real use cases when solved. The first problem that immediately came to mind was the Triangle Multiplicative Update used in AlphaFold2 and AlphaFold3, a series of extremely influential works in the BioML space that led to [John Jumper and Demis Hassabis winning the Nobel Prize in Chemistry](https://www.nobelprize.org/prizes/chemistry/2024/press-release/).
This operator is particularly nasty due to its cubic O(n^3) operations. The peak memory of this operator is so bad that most implementations of AlphaFold3 (see [Ligo’s OSS reproduction](https://github.com/Ligo-Biosciences/AlphaFold3) and MIT’s [Boltz-2](https://github.com/jwohlwend/boltz)) keep the batch size during training at 1, despite the models being less than 1B in parameter size!

**Note:** There will be no huge cash prizes from big company sponsors for this competition, but we will be providing never-before-seen merch for winners for free!

Good luck to everyone!
