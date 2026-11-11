---
name: Halden
type: city
region: ""
population: ""
controlled-by: ""
notable-characters: []
tags:
  - toy-city
status: active
---

# Halden

## Description

A clean, toy-scale 3D city of the stick-man kit: Blender-made pieces (`styles/stick-man/assets/halden/*.glb`: stone bank, diner, police station, glass tower, walk-ups, lamps, cars) and code sets (`styles/stick-man/lib/sets/`). Bright, solid colours, thin black ink on objects.

## History

Built for reels 1-5 (bank, street, plaza, park, lab, classroom, diner, workshop, harbour, island).

## Culture & Customs

Every real place in a true story is restaged on a Halden set (`systems/restaging.md`). The troupe lives here.

## Notable Features

Places, each with its own light (the reference changes light per place: per-shot brightness std 23-25):

| Place (location id) | Kit set | Mood and light | Status |
|---|---|---|---|
| `halden-lab` | `lab` | cool fluorescent white, teal shadows, one green accent (agar) | exists |
| `halden-lecture-hall` | `classroom` | warm tungsten, dim back rows | exists |
| `halden-diner` | `diner` (.glb) | warm noon, red neon accent | exists |
| `halden-kitchen` | new `kitchen` | early-morning blue window light, yellow lamp | to build (ep 1) |
| `halden-plaza-stage` | `halden-plaza` + `use: ['concert']` | night, one warm spotlight, magenta-blue shadows | exists (night grade new) |

## Current State

Season 1. Only ep 1's places are filed here; later places are filed when their episode is scripted.
