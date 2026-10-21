---
title: The /make-reel command
description: One slash command runs the whole process.
group: Make better reels
order: 1
---

Type `/make-reel` followed by a topic, a script in quotes, or one of the example scripts.

> /make-reel examples/02-api-explained.json

> /make-reel 3 mistakes people make when they start running

Type `/make-reel` with nothing after it to see the examples.

## Example scripts

`examples/` has three ready scripts that show off the animation, each with a world and camera idea:

- a morning-routine listicle,
- an API explainer,
- a tools listicle you fill in.

## Built-in review

Before it hands you the reel, Claude scores the hook (it ships at 8/10 or better), scans the whole MP4 for
problems, fixes them and logs every fix in `REVIEW.md`, up to 3 rounds.
