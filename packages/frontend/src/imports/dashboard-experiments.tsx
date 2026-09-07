Design a web dashboard screen for an academic research experiment management system used by behavioral science researchers.

The screen represents the **main dashboard where researchers can view and manage experiments**.
All experiment-specific configuration (participants, pairs, sessions, cards, etc.) happens **inside an experiment**, so the dashboard only focuses on experiment management.

STYLE
Clean academic interface, minimal and professional.
Neutral color palette (white, light gray, muted blue accents).
Modern SaaS-style layout similar to research tools or data dashboards.
Use card-based layout and a clear visual hierarchy.
Interface should be responsive for desktop and tablet.
Use components inspired by **shadcn/ui**.

LAYOUT STRUCTURE

Left sidebar navigation:

* Experiments (active)
* Results

The sidebar should be minimal because most configuration occurs **after opening an experiment**.

Main content area:

Page title at the top:
"Experiments"

Below the title, a primary action button:
"Create Experiment"

Below the button, display a **grid of experiment cards**.

Each experiment card should display:

* Experiment name (prominent)
* Short description
* Status badge (Draft, Active, Finished)

The **status indicator must use the badge component structure from shadcn/ui**, following the Radix badge pattern:
[https://ui.shadcn.com/docs/components/radix/badge](https://ui.shadcn.com/docs/components/radix/badge)

Use badge variants to represent experiment status:

* Draft → secondary badge
* Active → success / green badge
* Finished → outline or muted badge

Each experiment card includes actions:

* Open experiment
* Edit experiment

When the researcher clicks **Open experiment**, they will navigate to the internal experiment workspace where they can manage:

* Conditions
* Stimulus cards
* Participants
* Participant pairs
* Sessions
* Results

Include empty state behavior:
If there are no experiments, show a centered message:
"No experiments created yet"

Display a primary button:
"Create your first experiment"

VISUAL COMPONENTS

* Experiment cards
* Status badges implemented using **shadcn/ui Radix Badge**
* Primary action button
* Clean typography
* Spacious layout suitable for researchers managing multiple experiments
* Layout optimized for clarity and quick experiment access
