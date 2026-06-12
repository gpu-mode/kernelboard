---
id: linear-algebra-kernels-age-of-research
title: "Linear Algebra Kernels For The Age Of Research"
date: 2026-06-12
category: "General"
---

Authors: Mark Saroufim, Sai Surya Duvvuri

We're happy to announce a new kernel competition focused on classical linear algebra problems. These problems are old, important but still underexplored on modern hardware like B200.

We've been quiet in the last few months because it's quite hard to start a new neolab but we wanted to give you a sense as to the kinds of things we're working on. Most recently we've been dusting off our old linear algebra textbooks such as [Trefethen and Bau](https://www.stat.uchicago.edu/~lekheng/courses/309/books/Trefethen-Bau.pdf) since a lot of the workloads we're trying to accelerate break down to classical linear algebra problems with the first one being QR decomposition.

At a high level the goal is to take a real square matrix `A` and decompose it into `A = QR` where `Q` is an orthogonal matrix `Q^{T} = Q^{-1}` and `R` is an upper triangular matrix. The Gram-Schmidt process goes back to the 1800s. Gram's work was in 1883, Schmidt's more explicit version came in 1907.

The QR problem shows up everywhere but one recent application of interest is second-order optimization methods because those need to keep learned curvature directions orthogonal and numerically stable over time.

A modern approach is Householder QR. For each column, find a mirror that flips the column's below-diagonal entries to zero in one shot, leaving a single value on the diagonal. Reflect the whole remaining matrix through that mirror, move to the next column, and repeat. Because each column's reflection depends on the result of the previous one, the naive algorithm is inherently sequential and GPU unfriendly.

But in the famous words of our colleague Sonic, if we can parallelize prefix sums we can parallelize anything and there are indeed GPU-friendly algorithms such as blocked Householder where the trick is to accumulate reflections into a compact form and then apply one big matmul.

So for the first QR problem the reference implementation will be `torch.geqrf` which stands for GEneral QR Factorization. The reference implementation returns compact Householder factors `(H, tau)`, the evaluator materializes `Q` and extracts `R = triu(H)` and checks the following properties

* Factorization: `R ~= Q.T @ A`
* Orthogonality: `Q.T @ Q ~= I`
* Reconstruction: `Q @ R ~= A`
* Triangularity: `lower(Q.T @ A) ~= 0`.

However, we chose to define relative tolerances and scale them by `n * eps32`. The reason for this is we want you to experiment with approaches that lose accuracy by using lower bit widths but then try to recover it back. The benchmarks will mostly test dense random square matrices but the tests include rank-deficient, near-rank-deficient, banded, row-scaled, near-collinear, upper-triangular, and clustered-scale inputs because random dense matrices are not enough.

## Prize

We'll be using a simple scoring system: if any of your submissions are in the top 3 of any problem then you'll be recognized as a winner.

The main leaderboard ranks solutions by speed. But we also want to celebrate the submissions that are unusually elegant, unusually accurate, or just deeply strange and still correct. There will be rare swag.

The real prize is probably a bit more interesting, we'll clean up and publish the best linear algebra kernels in a standalone repo and work towards publishing a paper together.

And of course, next time you are in the Bay Area, come hang out with some top-tier linear algebra people and talk about what we should build next together.

## Getting started

We highly recommend you first check out the QR chapter in the textbook by [Trefethen and Bau](https://www.stat.uchicago.edu/~lekheng/courses/309/books/Trefethen-Bau.pdf)

After that you and your agents can make submissions via [popcorn-cli](https://github.com/gpu-mode/popcorn-cli)

If you'd like to stay up to date with newer problem releases or changes to the eval harness, or if you have questions, please follow updates and ask us in the linalg channel on [discord.gg/gpumode](https://discord.gg/gpumode)

## Acknowledgements
We'd like to thank Rohan Anil for pointing out which classical algorithms are worth accelerating, Core Automation for funding our Modal credits, Modal for providing the best GPU sandboxing service and Northflank for the best service hosting we could ask for.
