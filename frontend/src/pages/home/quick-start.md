## 1) Install `popcorn-cli`

```bash
curl -fsSL https://raw.githubusercontent.com/gpu-mode/popcorn-cli/main/install.sh | bash
```

## 2) Register your account

```bash
popcorn-cli register discord
```

## 3) Setup a project

Setup your project with a working example and agent skills for Codex or Claude Code.

```bash
popcorn-cli setup
```

## 4) Submit to leaderboard

```bash
popcorn-cli submit --gpu A100 --leaderboard grayscale_v2 --mode leaderboard submission.py
```

For a full overview of the commands, check out the [popcorn-cli repo](https://github.com/gpu-mode/popcorn-cli).
