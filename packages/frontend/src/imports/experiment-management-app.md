Design the information architecture and main page layouts for a web application used by researchers to manage behavioral experiments.

The interface should be structured around experiments as the central object. All configuration happens inside a selected experiment.

STYLE
Clean academic interface.
Minimal and professional visual design.
Neutral palette (white, light gray, soft blue accents).
Modern SaaS dashboard style.
Use UI patterns similar to shadcn/ui components.
Clear spacing, strong visual hierarchy, and table-based data management.

APPLICATION STRUCTURE

The application has three main pages.

DASHBOARD
Route: /

Purpose:
Allow the researcher to view and manage all experiments.

Layout:

Left sidebar navigation:

Experiments (active)

Main content area:

Page title:
"Experiments"

Primary action button:
"Create Experiment"

Below the button display a table of experiments.

Table columns:

Experiment name

Description

Status

Status should be displayed using a badge component following the shadcn/ui Radix Badge pattern.

Each row should have actions:

Open experiment

Edit experiment

Clicking a row opens the experiment workspace.

Empty state:
If there are no experiments, display a centered message:
"No experiments created yet"
with a button:
"Create your first experiment".

CREATE EXPERIMENT
Route: /experiments/new

Purpose:
Create a new experiment.

Layout:

Page title:
"Create Experiment"

Centered form inside a card container.

Form fields:

Experiment name

Description

Order of conditions

Status (Draft / Active / Finished)

Status selection should visually use a badge style consistent with shadcn/ui.

Actions:

Create Experiment (primary)

Cancel (secondary)

EXPERIMENT WORKSPACE
Route: /experiments/

Purpose:
This is the main workspace where researchers configure and run the experiment.

Layout:

Top section:
Experiment title and basic metadata.

Below the title, create tab navigation for experiment sections.

Tabs:

Overview
Shows general experiment information.

Conditions
Table listing experimental conditions.
Columns: condition name.

Stimulus Cards
Table listing stimulus cards used in trials.
Columns:

distribution type

magnitude

character gender

distributor side

Participants
Table listing registered participants.
Columns:

age

sex

school

Pairs
Interface to create participant pairs.

Sessions
Table listing experimental sessions.
Columns:

pair

start time

end time

status

UX PRINCIPLES

The experiment workspace should feel like a configuration hub.
Researchers should be able to move between tabs to configure every part of the experiment.

All data-heavy sections should use tables with add/edit/delete actions.

Use clear navigation, consistent spacing, and structured layouts optimized for research workflows.