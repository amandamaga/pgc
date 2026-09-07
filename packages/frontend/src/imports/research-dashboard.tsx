Design a web dashboard screen for an academic research experiment management system used by behavioral science researchers.

The screen represents the main dashboard where researchers can view and manage experiments.

STYLE
Clean academic interface, minimal and professional.
Neutral color palette (white, light gray, muted blue accents).
Modern SaaS-style layout similar to research tools or data dashboards.
Use card-based layout and a clear visual hierarchy.
Interface should be responsive for desktop and tablet.
Use components inspired by shadcn/ui.

LAYOUT STRUCTURE

Left sidebar navigation:

Experiments (active)

Participants

Sessions

Results

Main content area:

Page title at the top:
"Experiments"

Below the title, a primary action button:
"Create Experiment"

Below the button, display a grid or table of experiment cards.

Each experiment card should display:

Experiment name (prominent)

Short description

Status badge (Draft, Active, Finished)

The status indicator must use the badge component structure from shadcn/ui, specifically following the pattern from:
https://ui.shadcn.com/docs/components/radix/badge

Use badge variants to represent experiment status:

Draft → neutral/secondary badge

Active → green or success badge

Finished → muted or outline badge

Each card includes actions:

Open experiment

Edit experiment

Include empty state behavior:
If there are no experiments, show a centered message:
"No experiments created yet"
with a button:
"Create your first experiment"

VISUAL COMPONENTS

Cards for experiments

Status badges implemented using shadcn/ui Radix Badge structure

Primary action button

Simple table or card grid layout

Clean typography

Spacious layout suitable for researchers managing multiple experiments