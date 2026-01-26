---
id: kernelbench-cuda-compute
title: "Topping the GPU MODE Leaderboard with cuda.compute"
date: 2026-01-22
category: "General"
---

NVIDIA Engineers submitted solutions to the GPU MODE kernel competition for 6 classic primitive problems. These benchmarks evaluate kernel performance across multiple NVIDIA GPU architectures: B200, H100, A100, and L4.

The goal of this post is to showcase a new library in the CUDA Python family: `cuda.compute`. It provides a Pythonic interface to [CCCL ("CUDA Core Compute Library)](https://github.com/NVIDIA/cccl) algorithms, especially the CUB device-wide primitives that deliver highly tuned implementations of common algorithms across GPU generations. 

If you’ve watched earlier GPU MODE talks such as [Scan at the Speed of Light](https://www.youtube.com/watch?v=VLdm3bV4bKo), you’ve already seen the level of detail that goes into making a CCCL primitive truly speed-of-light. Likewise, [*llm.cpp*](https://www.youtube.com/watch?v=WiB_3Csfj_Q) showed how LLM inference pipelines can express more of their workloads in terms of existing CCCL algorithms instead of maintaining custom kernels.

`cuda.compute` allows you to stay in Python while leaning on the same speed-of-light building blocks used in CUDA C++. In fact, several first-place leaderboard submissions achieve state-of-the-art performance by leveraging CUB—either directly or through a Python interface.

We achieved the following results across six problems that directly exercise the core strengths of `cuda.compute`:

- [prefixsum](https://www.gpumode.com/v2/leaderboard/541?tab=rankings) (scan): 4/4 first places  
- [histogram](https://www.gpumode.com/v2/leaderboard/539?tab=rankings): 3/4 first places  
- [vectoradd](https://www.gpumode.com/v2/leaderboard/543?tab=rankings) (transform): 4/4 first places (one \#1 submission was also using `cuda.compute` but was not submitted by us)  
- [grayscale](https://www.gpumode.com/v2/leaderboard/538?tab=rankings) (transform): 1/4 first places, with the other GPUs very close  
- [sort](https://www.gpumode.com/v2/leaderboard/542?tab=rankings): 4/4 second places (the \#1 submissions all used CUB, the same library used by `cuda.compute` under the hood, but were submitted by another contestant)  
- [vectorsum](https://www.gpumode.com/v2/leaderboard/544?tab=rankings) (reduce): no first places but very close

Our implementations were among the top performers, but the leaderboard also highlighted specific edge cases where we can further optimize. We’ve already identified these gaps and are working on improvements for those architecture-problem combinations.

## What our submissions look like

Below are minimal submission-shaped examples of how simple it’s to use `cuda.compute`. The general pattern looks like this: First create a callable primitive via `cuda.compute.make_*`, then invoke it inside the `custom_kernel` function that is benchmarked.

### VectorAdd (Binary Transform)

One of the first kernels many people write when learning GPU programming is vector add. Here, we implement it using a CCCL binary transform.

```py
from task import input_t, output_t

import cuda.compute
from cuda.compute import OpKind

# Build time tensors (the sizes don't matter)
build_A = torch.empty(2, 2, dtype=torch.float16, device="cuda")
build_B = torch.empty(2, 2, dtype=torch.float16, device="cuda")
build_output = torch.empty(2, 2, dtype=torch.float16, device="cuda")

# Using cuda.compute: Binary Transform
transformer = cuda.compute.make_binary_transform(build_A, build_B, build_output, OpKind.PLUS)

def custom_kernel(data: input_t) -> output_t:
    A, B, output = data
    # Call the CUB kernel through cuda.compute
    transformer(A, B, output, A.numel())
    return output
```

This is as direct as it gets: you express an elementwise plus operation (`OpKind.PLUS`)  and the implementation comes from the tuned CUB primitive underneath.

If we compare this to another submission that scored exactly the same on A100, that solution is a highly optimized CUDA C++ extension using inline PTX and explicit vectorized memory instructions. The drawback to this approach is its architecture dependence. Transitioning to a new platform like Blackwell often leads to performance volatility, typically requiring significant retuning and revalidation to maintain peak efficiency. With `cuda.compute`, the Python code stays the same while CCCL/CUB handles architecture-aware tuning under the hood.

### PrefixSum (Inclusive Scan)

The objective was an inclusive prefix sum, similar to `torch.cumsum`. CCCL has a direct primitive for this: inclusive scan.

```py
from task import input_t, output_t

import cuda.compute
from cuda.compute import OpKind
import torch

# Build time tensors
build_in = torch.empty(1, dtype=torch.float32, device="cuda")
build_out = torch.empty(1, dtype=torch.float32, device="cuda")

# Using cuda.compute: Inclusive Scan
scanner = cuda.compute.make_inclusive_scan(build_in, build_out, OpKind.PLUS, None)

# Allocate temporary storage
input_size = 268435456
temp_storage_size = scanner(None, build_in, build_out, input_size, None)
d_temp_storage = torch.empty(temp_storage_size, dtype=torch.uint8, device="cuda")

def custom_kernel(data: input_t) -> output_t:
    d_in, d_out = data
    scanner(d_temp_storage, d_in, d_out, len(d_in), None)
    return d_out
```

### Histogram

The objective is to count how many elements fall into each bin across a fixed range. CCCL provides this primitive directly, and `cuda.compute` exposes it in Python.

```py
from task import input_t, output_t

import cuda.compute
import numpy as np
import torch

# Build time tensors
input_size = 10485760
num_output_levels = np.array([257], dtype=np.int32)
lower_level = np.array([0], dtype=np.int32)
upper_level = np.array([256], dtype=np.int32)
build_data = torch.empty((input_size,), dtype=torch.uint8, device="cuda")
build_histogram = torch.empty((num_output_levels[0] - 1,), dtype=torch.int32, device="cuda")

# Using cuda.compute: Histogram Even
histogrammer = cuda.compute.make_histogram_even(build_data, build_histogram, num_output_levels, lower_level, upper_level, input_size)

temp_storage_size = histogrammer(None, build_data, build_histogram, num_output_levels, lower_level, upper_level, input_size)
d_temp_storage = torch.empty(temp_storage_size, dtype=torch.uint8, device="cuda")

def custom_kernel(data: input_t) -> output_t:
    d_in, _ = data
    histogrammer(d_temp_storage, d_in, build_histogram, num_output_levels, lower_level, upper_level, len(d_in))
    return build_histogram

```

### Grayscale (custom struct \+ unary transform)

The objective is to implement a basic RGB to grayscale conversion using: `Y = 0.2989 R + 0.5870 G + 0.1140 B`

Unlike scan/histogram/sort, this isn’t something CCCL would ship as a named primitive. Instead, CCCL gives you the building blocks (transform \+ custom operators). `cuda.compute` brings that same flexibility to Python.

This example shows how to define a GPU struct, write a Python function that expresses the operation, and pass it to `cuda.compute.make_unary_transform`.

```py
from task import input_t, output_t

import cuda.compute
from cuda.compute import gpu_struct
import cupy as cp
import numpy as np
import torch

@gpu_struct
class Pixel:
    r: np.float32
    g: np.float32
    b: np.float32

def as_grayscale(p: Pixel) -> np.float32:
    return (
        np.float32(0.2989) * p.r +
        np.float32(0.587) * p.g +
        np.float32(0.114) * p.b
    )

build_in = cp.empty(1, dtype=Pixel)
build_out = torch.empty(1, dtype=torch.float32, device="cuda")

transformer = cuda.compute.make_unary_transform(build_in, build_out, as_grayscale)

def custom_kernel(data: input_t) -> output_t:
    d_in, d_out = data
    size = len(d_in)
    transformer(d_in, d_out, size * size)

    return d_out
```

## Try `cuda.compute` today

These examples highlight the CCCL advantage: providing high-performance, portable primitives that remain optimized across different GPU architectures. `cuda.compute` is the Pythonic way to access these tuned building blocks without writing C++ bindings or maintaining custom extensions.

You can try `cuda.compute` today by installing it via pip or conda:

```
pip install cuda-cccl[cu13] (or [cu12])

conda install -c conda-forge cccl-python cuda-version=12 (or 13)
```

For more resources check out our [docs](https://nvidia.github.io/cccl/python/parallel.html) and [examples](https://github.com/NVIDIA/cccl/tree/main/python/cuda_cccl/tests/parallel/examples). We are usually hanging out in the [GPU MODE discord](https://discord.gg/gpumode) or can always reach out to us on Github.
