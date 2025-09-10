---
id: jane-street-hackathon
title: "GPU MODE East Coast with Jane Street"
date: 2025-09-10
category: "General"
---

Off the back of [Lisa Su’s recognition](https://www.gpumode.com/v2/news) in June at AMD’s Advancing AI Day, GPU MODE headed to the East Coast and in collaboration with Jane Street, hosted a hackathon this past weekend. A special thanks to [CoreWeave and NorthFlank](https://www.linkedin.com/posts/william-j-stewart_jane-street-northflank-coreweave-activity-7371165659688226816-6DbI?utm_source=share&utm_medium=member_desktop&rcm=ACoAAAWbErgBtCPmRJStcIqOGtOiTogXhv9YJ8g) for providing the platform and compute. This was the highest utilization hackathon CoreWeave has been a part of, with 90% utilization as opposed to the typical 10%.

###### The Challenge
The [hackathon challenge](https://github.com/janestreet-gpu-mode/hackathon/tree/main) was to speed up an intentionally slow neural network without breaking its accuracy. The neural network ensembled 4 different sequence models (Mamba2, RetNet, Hawk, and xLSTM), that processed streaming data across different "symbols", akin to stock tickers. The goal was to maximize the model’s PnL, a blackbox scoring function which took a model’s latency and accuracy as inputs, during market hours. There were two market rounds: a 6 hour round that started roughly when folks started hacking (to reward fast iteration) and a 30 minute round at the end of hacking (to reward the best overall optimizations). There were 20 teams with a maximum of 5 participants per team; and $165k worth of prizes, with $10k per person for the winning team of each round.

<figure>
  <img src="/static/images/round_1_JS.png" alt="Leaderboard Round 1" />
  <figcaption>Round 1 winners</figcaption>
</figure>
<figure>
  <img src="/static/images/round_2_JS.png" alt="Leaderboard Round 2" />
  <figcaption>Round 2 winners. The teams that placed 2nd & 3rd place won those slots for both rounds. Sparrow was #1 for most of the day and got a discretionary prize. </figcaption>
</figure>

Participants came from all across North America, (California, Wisconsin, Texas, Toronto, etc.), and were both students and industry vets such as CUDA programmers from trading firms or folks working on GPU profilers. Overall, there was overwhelming positive feedback from [attendees](https://x.com/bdepyzy_/status/1965121181503422943?s=46), [winners](https://x.com/NadavTimor/status/1965082710730551701) and even [those searching for talent](https://x.com/stake_jevens/status/1964499440133427256) with a day that had participants [so locked in](https://x.com/GPU_MODE/status/1964516306822045996) that many opted to skip Jane Street’s delicious spread in favour of optimizing their models.

![Final Moments](/static/images/nailbiting_JS.png)

A big congratulations to the winning teams of each round - Cougar & [Crane](https://www.linkedin.com/posts/kylecyu_we-won-1st-place-at-the-jane-street-x-gpu-activity-7370837082140774400-dvxP?utm_source=share&utm_medium=member_desktop&rcm=ACoAAAWbErgBtCPmRJStcIqOGtOiTogXhv9YJ8g)!

![Team Cougar](/static/images/cougar_JS.png)
![Team Crane](/static/images/crane_JS.png)

###### The Submissions
[Crane's submission](https://github.com/kyolebu/janestreet-gpumode-hackathon/blob/main/example_model.py) produced the highest PnL in round 2 and made the organizers most proud. The main “kernel” level optimization was actually just running `self.model = torch.compile(self.model,mode="reduce-overhead",fullgraph=True)`. The biggest lift came from batching incoming symbols such that you could process multiple symbols at once.  Doing batching correctly was extremely difficult as one needed to keep track of the models’ hidden state per symbol. Only 2-3 teams managed to do this correctly, and the winning team only managed to do it in the last hour of competition or so (and the game authors could barely do it in time during play testing).

Team strategies tended to range. Some folks ignored the hidden state or portions of the model entirely. While this strategy reduced the model’s accuracy, it greatly reduced latency. Others played around with torch.compile flags and did various quantization schemes (mostly to fp16/bf16). Two teams used distillation in their strategies. The team who committed fully to it managed to get a model ~300% faster than the winning team, but at the cost of being right only a fifth of the time. Another team tried to make use of all 6 GPUs they were given (usually a team used 1 to serve their model and 5 for development), and attempted to do distributed inference.  Overall, we were happy with the mix of strategies, and thought there was a healthy amount of experimentation.

![PnL woes](/static/images/compile_woes_1_JS.png)
![Max-Autotune woes](/static/images/compile_woes_2_JS.png)
![Don't Compile](/static/images/compile_woes_3_JS.png)

###### BackendBench & other wisdom
Before the hacking, attendees got to hear from [Tri Dao](https://x.com/tri_dao?lang=en), a panel of the PyTorch founders ([Soumith Chintala](https://x.com/soumithchintala), [Gregory Chanan](https://www.linkedin.com/in/gregory-chanan-49530836?trk=public_post-text), [Sam Gross](https://www.linkedin.com/in/samgross?trk=public_post-text)) and NYC native/ founder of GPU Mode [Mark Saroufim](https://x.com/marksaroufim?lang=en).
Mark presented [BackendBench](https://github.com/meta-pytorch/BackendBench/blob/main/docs/correctness.md) ([full presentation](https://www.youtube.com/watch?v=BTfjdyZOKww)), an eval suite designed to test how well LLMs and humans can write PyTorch backends, focusing on operator correctness and performance. Key features include comprehensive correctness testing, using PyTorch’s OpInfo test suite, performance benchmarks using real tensor shapes from Hugging Face/TorchBench, and easy integration by enabling kernels to be pip-installed and used in real models without code changes.  Overall, folks who care about correctness of kernels like Tri Dao, [Tianqi Chen](https://www.linkedin.com/in/tianqi-chen-679a9856) and the original KernelBench team gave positive feedback.

Recently Tri has been thinking a lot about the tradeoff between productivity and performance of various DSLs to optimize models (ie. torch.compile, Triton, CuTe DSL). [He spoke](https://www.youtube.com/watch?v=5qSN-R_E3w0) about his thoughts on this Pareto frontier. Speed-of-light GPU kernel performance demands deep hardware-aware tuning, especially for memory-bound operations. Tri is a large fan of CuTe DSL as it offers both the productivity of Python with the control and performance of CUDA/PTX.

![Tri Dao presenting](/static/images/Tri_JS.png)

The panel was a special treat and we heard some old stories ranging from [Jeff Johnson](https://github.com/wickedfoo)’s 3h crash course to Greg on GPUs, Soumith’s past music career and thoughts on compilation times and finally Sam’s belief that we'd have had python in prod sooner if we had no-gil.

![PyTorch Founder Panel ](/static/images/panel_JS.png)

###### GPU MODE & friends
The [discord server](https://discord.gg/gpumode)  continues to grow with ~5000 new members in the last 6 months; a second ongoing [100k competition with AMD](https://www.datamonsters.com/amd-developer-challenge-2025#wf-form-AMD-Email-Form); [a distributed series on YouTube](https://www.youtube.com/@GPUMODE/videos); and [GPU MODE IRL#2](https://events.accel.com/gpumodehackathon) coming in October.
