# Fresh Utility Color Design

## Goal

This document fixes the `Fresh Utility` color scheme from `saas-color-schemes.html` as the base color system for future page design work.

The goal of the scheme is to keep the interface light, clean, and operational, with a soft green character instead of a generic blue enterprise palette.

## Color Tokens

The following semantic tokens are the source of truth for page colors:

| Token | Value | Role |
| --- | --- | --- |
| `background` | `#F2FFD9` | Main page background |
| `background-alt` | `#DAF1D2` | Secondary background areas and soft section separation |
| `surface` | `rgba(249, 255, 244, 0.5)` | Cards, panels, and elevated blocks |
| `text-primary` | `#152114` | Main headings and body text |
| `text-secondary` | `#4F654D` | Supporting text, descriptions, and metadata |
| `accent` | `#2F9A48` | Primary actions, active states, and important highlights |
| `accent-foreground` | `#F4FFF6` | Text or icons placed on accent backgrounds |
| `border` | `rgba(21, 33, 20, 0.12)` | Subtle borders and separators |
| `glow` | `rgba(47, 154, 72, 0.26)` | Decorative gradients, soft emphasis, and ambient highlight effects |

## Usage Rules

- The overall page should stay light and airy, with `background` as the dominant base.
- `background-alt` should separate sections gently, not create heavy contrast bands.
- `surface` should be used for cards and content blocks that need visual elevation without becoming opaque white.
- `accent` should remain the main interactive color and should not be diluted by additional competing accent hues.
- `text-primary` should be used for all critical reading paths; `text-secondary` should support it, not replace it.
- `border` should remain subtle and structural.
- `glow` is decorative and should be used sparingly to preserve the clean utility feel.

## Constraints

- Do not replace the green accent with blue, purple, or neutral gray branding accents.
- Do not shift the page toward dark mode while this scheme is active.
- Do not introduce extra semantic colors unless a later design document defines them explicitly.
