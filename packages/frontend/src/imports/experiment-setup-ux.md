Design the UX flow and page layouts starting from the **Create Experiment screen** for a web application used by behavioral science researchers to configure and run experiments.

STYLE
Clean academic SaaS interface.
Minimal, professional design with clear hierarchy.
White background, light gray surfaces, muted blue accents.
Use UI patterns similar to **shadcn/ui components** (cards, tables, badges, tabs).
Desktop-first layout designed for researchers managing structured experimental data.

---

PAGE — CREATE EXPERIMENT
Route: /experiments/new

Purpose:
Allow the researcher to create the base structure of a new experiment before configuring the rest of the setup.

Layout:

Centered card container with form fields.

Title:
Create Experiment

Form fields:

Experiment Name
Text input field.

Description
Multi-line text field for experiment summary.

Condition Order
Dropdown selector:

* Random
* Fixed

Status
Selectable badges using the **shadcn/ui Radix Badge pattern**:

* Draft (default)
* Active
* Finished

Actions:

Primary button:
Create Experiment

Secondary button:
Cancel

After clicking **Create Experiment**, the user is redirected to the **Experiment Workspace**.

---

PAGE — EXPERIMENT WORKSPACE
Route: /experiments/:id

Purpose:
This page acts as the **central configuration hub** where the researcher prepares the entire experiment before running sessions.

Top section layout:

Experiment title (large text)
Example:
Altruistic Punishment Study

Metadata row below the title:

Status badge
Creation date
Edit experiment button

Below the header place **horizontal tab navigation**.

Tabs:

Overview
Conditions
Stimulus Cards
Participants
Pairs
Sessions

The workspace should visually resemble a **research configuration environment**, where each tab represents a setup stage.

---

TAB — OVERVIEW

Purpose:
Provide a quick summary of the experiment configuration progress.

Layout:

Card showing experiment description.

Below it display **progress indicators** for setup steps:

Conditions configured
Stimulus cards configured
Participants added
Pairs created
Sessions created

Each progress item should display either:

✓ Complete
0 configured
or numeric counts.

---

TAB — CONDITIONS

Purpose:
Allow researchers to define experimental conditions.

Top action button:
Add Condition

Table layout:

Columns:
Condition Name

Row actions:
Edit
Delete

Empty state message:
"No conditions created yet".

---

TAB — STIMULUS CARDS

Purpose:
Register the stimulus cards used during trials.

Top action button:
Add Stimulus Card

Table columns:

Distribution Type
Magnitude
Character Gender
Distributor Side

Row actions:
Edit
Delete

Cards should be displayed in a structured data table format.

---

TAB — PARTICIPANTS

Purpose:
Associate participants with the experiment.

Top button:
Add Participant

Participants should be selected from a **global participant registry**.

Table columns:

Age
Sex
School

Row actions:
Remove participant from experiment.

---

TAB — PAIRS

Purpose:
Create pairs of participants that will interact in the experiment.

Top button:
Create Pair

Pair creation form fields:

Participant A (dropdown selector)
Participant B (dropdown selector)

Table columns:

Participant A
Participant B

Row actions:
Delete pair

Optional secondary action:
Auto generate pairs.

---

TAB — SESSIONS

Purpose:
Manage the execution of experimental sessions.

Top button:
Create Session

Session creation form fields:

Select Pair
Start Time
End Time

Table columns:

Pair
Start Time
End Time
Status

Status badges:

Scheduled
Running
Completed

---

UX PRINCIPLE

The interface should guide the researcher through a **clear experimental setup pipeline**, encouraging configuration in the following order:

Conditions → Stimulus Cards → Participants → Pairs → Sessions

Each section should prioritize **structured tables, clear actions, and minimal cognitive load**, allowing researchers to quickly configure complex experiments.
