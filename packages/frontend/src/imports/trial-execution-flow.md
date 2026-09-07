Design the **trial (tentativa) execution flow** for a behavioral experiment platform. This flow represents the participant experience during a session and must integrate with the existing experiment structure.

Trials occur **inside sessions** and are generated automatically from the configured stimulus cards. Researchers do not manually create trials.

The trial flow must be simple, controlled, and suitable for experimental environments.

SESSION STRUCTURE

Experiment
→ Session
→ Pair
→ Trials

Each pair plays multiple trials sequentially during a session.

Each trial corresponds to one **stimulus card presentation and participant decision**.

---

TRIAL FLOW

The trial flow must follow this exact sequence:

Waiting Screen
↓
Stimulus Presentation
↓
Decision
↓
Feedback
↓
Next Trial

After the final trial the system redirects to the **End Screen**.

---

SCREEN — WAITING

Purpose:
Prepare participants before the experiment begins.

Layout:

Centered card.

Text:
"Waiting for the experiment to begin."

Optional progress indicator showing:

Session Name
Pair ID

No decision actions are available.

The researcher starts the session from the **Session Monitor**.

---

SCREEN — STIMULUS PRESENTATION

Purpose:
Display the experimental stimulus for the current trial.

Layout:

Large stimulus card centered on the screen.

The stimulus card contains:

Character A
Character B
Situation description

Example:

"Character A distributed 8 coins to themselves and 2 coins to Character B."

Visual layout:

Two characters displayed side by side.
Coins displayed below each character.

Additional elements:

Round indicator:
Round 1 of N

Progress bar indicating experiment progression.

No buttons are visible during the initial presentation phase.

Optional timer before decision screen appears.

---

SCREEN — DECISION

Purpose:
Allow the participant to make a decision.

Prompt:

"Do you want to punish the distributor?"

Decision buttons:

Punish
Do Not Punish

Buttons must be large and clearly separated.

Coin counter remains visible.

A reaction timer begins when the decision buttons appear.

The decision triggers the creation of a **Trial record**.

Trial fields recorded:

Session ID
Pair ID
Stimulus Card ID
Round Number
Decision
Reaction Time
Timestamp

---

SCREEN — FEEDBACK

Purpose:
Provide immediate feedback after the decision.

Layout:

Display outcome message.

Examples:

"You chose to punish."
"You chose not to punish."

Display updated coin totals if applicable.

Show a short delay before proceeding.

Button:

Next Round

If the last round has been reached the system proceeds to the end screen.

---

SCREEN — END

Purpose:
Conclude the experiment session.

Layout:

Centered message.

Text:

"Experiment completed. Thank you for participating."

Optional information:

Total rounds played
Final coin count

Button:

Finish

Participants exit the session after this screen.

---

TRIAL DATA STRUCTURE

Trials must be stored as the fundamental experimental data unit.

Trial fields:

Trial ID
Session ID
Pair ID
Stimulus Card ID
Round Number
Decision
Reaction Time
Created At

Trials are automatically generated during the decision step.

---

UX PRINCIPLE

The trial flow must minimize distractions and cognitive load.

The interface should present **one decision at a time**, ensuring controlled experimental conditions.

Participants should always see:

Current round
Stimulus
Decision options
Progress indicator

This guarantees consistent experimental execution across sessions.
