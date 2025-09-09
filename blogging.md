example: https://raw.githubusercontent.com/gpu-mode/kernelboard/refs/heads/main/kernelboard/static/news/2025-06-24-triangle-multiplication.md

you should create a new md file in https://github.com/gpu-mode/kernelboard/blob/main/kernelboard/static/news/

make sure set header at top of the md file:
---
id:  {UNIQUE_ID}  // must be unique across news
title: {YOUR_NEWS_TITLE}
date:  YYYY-MM-DD
category: "General"
---

then just write it as normal markdown

Put your images in /static/images/ and attach it using the below format

`![{YOUR_IMAGE_NAME](/static/images/trimul_teaser.png)`

Instructions courtesy of Yang Wang
