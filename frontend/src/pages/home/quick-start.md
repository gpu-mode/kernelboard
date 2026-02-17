## 1) Install `popcorn-cli`

```bash
curl -fsSL https://raw.githubusercontent.com/gpu-mode/popcorn-cli/main/install.sh | bash
```

## 2) Register your account

```bash
popcorn-cli register discord
```

## 3) Download a starter kernel

```bash
wget https://raw.githubusercontent.com/gpu-mode/reference-kernels/refs/heads/main/problems/pmpp_v2/grayscale_py/submission.py
```

## 4) Submit to leaderboard

```bash
popcorn-cli submit --gpu A100 --leaderboard grayscale_v2 --mode leaderboard submission.py
```

For a full overview of the commands, check out the [popcorn-cli repo](https://github.com/gpu-mode/popcorn-cli).
