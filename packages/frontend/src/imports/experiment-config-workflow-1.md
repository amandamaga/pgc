Design the full **experiment configuration workflow** for a web application used by behavioral science researchers to configure experiments before running them.

The interface should guide the researcher through a **clear step-by-step configuration pipeline**. Each page corresponds to one stage of experiment preparation.

The workflow must follow this exact sequence:

Conditions
↓
Stimulus Cards
↓
Participants
↓
Pairs
↓
Sessions

---

PAGE — CONDITIONS

Purpose:
Allow researchers to define the experimental conditions.

Title:
Experimental Conditions

Short description:
Define the experimental conditions used in this experiment.

Primary button:
Add Condition

Main content:
Table listing all conditions.

Table columns:
Condition Name
Actions

Row actions:
Edit
Delete

Empty state message:
"No conditions created yet"

Button:
Add first condition

Modal for creating a condition:

Field:
Condition Name

Buttons:
Cancel
Create Condition

After conditions are created the researcher proceeds to the next step.

---

PAGE — STIMULUS CARDS

Purpose:
Register all stimulus cards used during experimental trials.

Title:
Stimulus Cards

Description:
Configure the stimulus cards that will appear during experiment trials.

Primary button:
Add Stimulus Card

Table columns:

Distribution Type
Magnitude
Character Gender
Distributor Side
Actions

Row actions:
Edit
Delete

Modal for creating a stimulus card:

Fields:

Distribution Type (dropdown)
Magnitude (numeric input)
Character Gender (dropdown)
Distributor Side (dropdown)

Buttons:

Cancel
Create Stimulus Card

Empty state message:

"No stimulus cards created yet"

Button:

Add first stimulus card

---

PAGE — PARTICIPANTS

Purpose:
Associate participants with the experiment.

Participants are selected from a **global participant registry**.

Title:
Participants

Description:
Select participants that will take part in this experiment.

Primary button:
Add Participant

Add Participant modal:

Searchable participant selector.

Main table columns:

Participant ID
Age
Sex
School
Actions

Row actions:
Remove from experiment

Empty state message:

"No participants added to this experiment"

Button:

Add participants

---

PAGE — PAIRS

Purpose:
Create pairs of participants that will interact during the experiment.

Title:
Participant Pairs

Description:
Create pairs of participants that will play together in experimental sessions.

Primary button:
Create Pair

Pair creation modal:

Participant A (dropdown)
Participant B (dropdown)

Buttons:
Cancel
Create Pair

Main table columns:

Participant A
Participant B
Actions

Row actions:
Delete pair

Optional secondary action:

Auto generate pairs

This action automatically pairs participants sequentially.

Empty state message:

"No pairs created yet"

Button:

Create first pair

---

PAGE — SESSIONS

Purpose:
Create experimental sessions where pairs will run the experiment.

Title:
Sessions

Description:
Create and manage experiment sessions.

Primary button:
Create Session

Session creation modal:

Pair (dropdown selector)
Start Time (datetime)
End Time (datetime)

Buttons:

Cancel
Create Session

Main table columns:

Pair
Start Time
End Time
Status

Status badges:

Scheduled
Running
Completed

Row actions:

Start Session
Edit
Delete

Empty state message:

"No sessions created yet"

Button:

Create first session

---

UX PRINCIPLE

The interface should clearly communicate that experiment setup follows a **structured pipeline**.

Researchers should naturally move through the steps in this order:

Conditions → Stimulus Cards → Participants → Pairs → Sessions

Each page should prioritize **structured tables, clear primary actions, and minimal cognitive load**, enabling researchers to configure complex experiments efficiently.
