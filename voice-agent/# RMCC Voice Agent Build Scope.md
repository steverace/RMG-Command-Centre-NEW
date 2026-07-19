# RMCC Voice Agent Build Scope

Build a standalone prototype called **RMCC Voice Agent**.

This must be built as a separate project that can later connect to the Race Media Control Centre dashboard.

## Goal

Create a British butler-style AI voice/chat assistant for RMCC.

The assistant should eventually help Steve:

* check active projects
* add projects
* add tasks
* add ideas
* add notes
* summarise what is going on
* highlight stale projects
* highlight money owed
* recommend today’s focus
* provide weekly roundups

## Important

Do not modify the RMCC dashboard directly yet.

Build this as a standalone service/prototype first.

It should be designed so it can later connect to RMCC through safe API actions.

## Suggested Stack

Use LiveKit Agents for the realtime voice/chat agent.

Use a simple local or browser frontend for testing.

The first version can use mock RMCC data.

## Voice Style

The assistant should not copy or clone any real actor.

Do not imitate Michael Caine directly.

Instead use this personality:

* British butler
* warm but slightly stern
* dry humour
* professional
* loyal but honest
* gently sarcastic when Steve is starting too many projects
* practical and direct
* never rude
* focused on helping Steve finish things

Example style:

“Good morning Steve. You have seven active projects, which is bold, optimistic, and mildly terrifying.”

“Before inventing another empire, I suggest finishing Queen Bee.”

“Your outstanding money currently deserves more attention than your next genius idea.”

## Voice Provider

Prepare the project so it can support ElevenLabs later.

Preferred ElevenLabs voice direction:

* “The British Butler”
* elderly British male
* posh accent
* dry humour
* slow, clear speech

Keep the voice provider modular so another provider can be swapped in later.

## Modes

Build support for these modes:

### 1. Text Chat Mode

User types a message.
Assistant responds in text.

### 2. Push-To-Talk Voice Mode

User clicks a microphone button.
Audio is transcribed.
Assistant responds.
Optional voice reply if configured.

### 3. Always-On Footer Mode

Do not activate by default.

Design it as a future optional mode.

The dashboard should eventually be able to show a small footer assistant bar that can be turned on or off.

Example:

“Alfred Mode: On / Off”

The assistant should never listen continuously unless the user explicitly enables it.

## Initial Mock Actions

Create mock functions for now:

* getTodayFocus
* getActiveProjects
* getStaleProjects
* getOverdueTasks
* getOutstandingMoney
* addIdea
* addTask
* addProjectNote
* summariseProject

These should use fake/sample data first.

Later they will call RMCC API endpoints.

## Future RMCC Integration

Design the agent so RMCC can connect via whitelisted API actions.

The agent must not connect directly to Supabase.

The future architecture should be:

RMCC Dashboard
→ Safe RMCC API actions
→ RMCC Voice Agent
→ LLM / TTS / STT providers

## Safety Rules

No raw database access.

No service role key in the frontend.

No payment actions.

No invoice actions.

No deleting projects.

No editing money fields in the first version.

All future write actions should be auditable.

## Deliverables

Create:

* working standalone prototype
* README setup instructions
* environment variable example file
* mock RMCC data
* modular voice provider structure
* modular action/tool structure
* clear notes explaining how this will connect to RMCC later

## Build Priority

1. Basic text assistant
2. Mock RMCC actions
3. Push-to-talk voice input
4. Optional spoken replies
5. Always-on footer mode scaffold, disabled by default
6. Documentation for future RMCC integration
