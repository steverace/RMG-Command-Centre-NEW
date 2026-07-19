from __future__ import annotations

import asyncio
import re
from pathlib import Path
from typing import Any, Callable

from dotenv import load_dotenv
from livekit.agents import (
    Agent,
    AgentServer,
    AgentSession,
    JobContext,
    RunContext,
    cli,
    function_tool,
)

ROOT = Path(__file__).resolve().parents[1]
LEGACY_ROOT = ROOT.parent.parent / "Race Media Command Centre Voice Agent"
load_dotenv(ROOT.parent / ".env")
load_dotenv(LEGACY_ROOT / ".env")
load_dotenv(ROOT / ".env", override=True)

from mock_actions import (  # noqa: E402
    addIdea,
    addProjectNote,
    addTask,
    getActiveProjects,
    getOutstandingMoney,
    getOverdueTasks,
    getStaleProjects,
    getTodayFocus,
    summariseProject,
    updateProject,
    updateTask,
)
from voice_providers import build_session_config  # noqa: E402

PERSONALITY_FILE = ROOT / "butler-personality.md"


def load_personality() -> str:
    return PERSONALITY_FILE.read_text(encoding="utf-8")


async def _run_blocking(function: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    return await asyncio.to_thread(function, *args, **kwargs)


@function_tool
async def get_today_focus(context: RunContext) -> dict[str, Any]:
    """Get Steve's recommended focus from the real RMCC dashboard when configured."""
    return await _run_blocking(getTodayFocus)


@function_tool
async def get_active_projects(context: RunContext) -> list[dict[str, Any]]:
    """List active projects from the real RMCC dashboard when configured."""
    return await _run_blocking(getActiveProjects)


@function_tool
async def get_stale_projects(context: RunContext) -> list[dict[str, Any]]:
    """List active projects that have not been worked recently."""
    return await _run_blocking(getStaleProjects)


@function_tool
async def get_overdue_tasks(context: RunContext) -> list[dict[str, Any]]:
    """List overdue tasks from the real RMCC dashboard when configured."""
    return await _run_blocking(getOverdueTasks)


@function_tool
async def get_outstanding_money(context: RunContext) -> dict[str, Any]:
    """Summarise outstanding project money. This is read-only."""
    return await _run_blocking(getOutstandingMoney)


@function_tool
async def summarise_project(context: RunContext, project_name: str) -> dict[str, Any]:
    """Summarise a real RMCC project, including its task and money context."""
    return await _run_blocking(summariseProject, project_name)


def _is_confirmation(value: str) -> bool:
    normalized = re.sub(r"\s+", " ", value.strip().lower())
    if normalized in {"yes", "yes please", "confirm", "confirmed", "approve", "approved", "go ahead", "do it", "do that"}:
        return True
    return normalized.startswith(("yes ", "confirm ", "approve ")) or "go ahead" in normalized


def build_write_tools() -> list[Callable[..., Any]]:
    pending: dict[str, Any] = {}

    def preview(action: str, description: str, function: Callable[..., Any], *args: Any, **kwargs: Any) -> dict[str, Any]:
        pending.clear()
        pending.update({"action": action, "description": description, "function": function, "args": args, "kwargs": kwargs})
        return {
            "ok": True,
            "confirmationRequired": True,
            "message": f"Ready to {description}. Nothing has been changed. Ask Steve for confirmation before executing it.",
            "preview": {"action": action, "description": description},
        }

    @function_tool
    async def add_idea(context: RunContext, text: str) -> dict[str, Any]:
        """Prepare an idea capture. It does not write until confirm_pending_action is called."""
        return preview("add_idea", f'capture the idea "{text.strip()}"', addIdea, text)

    @function_tool
    async def add_task(
        context: RunContext,
        project_name: str,
        title: str,
        notes: str | None = None,
        due_date: str | None = None,
        priority: str | None = None,
    ) -> dict[str, Any]:
        """Prepare a real RMCC task creation. It does not write until confirmed."""
        return preview(
            "create_task",
            f'create the task "{title.strip()}" in {project_name.strip()}',
            addTask,
            project_name,
            title,
            notes,
            due_date,
            priority,
        )

    @function_tool
    async def update_task(
        context: RunContext,
        task_id: str,
        status: str | None = None,
        title: str | None = None,
        notes: str | None = None,
        due_date: str | None = None,
        priority: str | None = None,
        project_id: str | None = None,
        ready_for_ai: bool | None = None,
        requires_manual: bool | None = None,
    ) -> dict[str, Any]:
        """Prepare a narrowly scoped task update. It does not write until confirmed."""
        patch = {
            key: value
            for key, value in {
                "status": status,
                "title": title,
                "notes": notes,
                "due_date": due_date,
                "priority": priority,
                "project_id": project_id,
                "ready_for_ai": ready_for_ai,
                "requires_manual": requires_manual,
            }.items()
            if value is not None
        }
        return preview("update_task", f"update task {task_id}", updateTask, task_id, patch)

    @function_tool
    async def update_project(
        context: RunContext,
        project_id: str,
        status: str | None = None,
        priority: str | None = None,
        due_date: str | None = None,
        next_action: str | None = None,
        ai_can_help: bool | None = None,
        manual_required: bool | None = None,
    ) -> dict[str, Any]:
        """Prepare a safe project update. Money fields and deletion are not exposed."""
        patch = {
            key: value
            for key, value in {
                "status": status,
                "priority": priority,
                "due_date": due_date,
                "next_action": next_action,
                "ai_can_help": ai_can_help,
                "manual_required": manual_required,
            }.items()
            if value is not None
        }
        return preview("update_project", f"update project {project_id}", updateProject, project_id, patch)

    @function_tool
    async def add_project_note(context: RunContext, project_name: str, note: str) -> dict[str, Any]:
        """Prepare an auditable project context note. It does not write until confirmed."""
        return preview("append_project_context", f'add a note to {project_name.strip()}', addProjectNote, project_name, note)

    @function_tool
    async def confirm_pending_action(context: RunContext, confirmation: str) -> dict[str, Any]:
        """Execute the pending write only after Steve explicitly confirms it."""
        if not _is_confirmation(confirmation):
            return {"ok": False, "confirmationRequired": True, "message": "No change was made. Say confirm, yes, or go ahead to approve the pending action."}
        if not pending:
            return {"ok": False, "message": "There is no pending action to confirm."}

        action = dict(pending)
        pending.clear()
        try:
            result = await _run_blocking(action["function"], *action["args"], **action["kwargs"])
        except Exception as error:
            return {
                "ok": False,
                "confirmed": False,
                "action": action["action"],
                "message": f"The approved action failed: {error}",
            }
        if isinstance(result, dict) and result.get("ok") is False:
            return {
                "ok": False,
                "confirmed": False,
                "action": action["action"],
                "message": result.get("error", "The approved action was not applied."),
                "result": result,
            }
        return {"ok": True, "confirmed": True, "action": action["action"], "result": result}

    return [add_idea, add_task, update_task, update_project, add_project_note, confirm_pending_action]


server = AgentServer()


@server.rtc_session()
async def entrypoint(ctx: JobContext):
    session = AgentSession(**build_session_config())
    agent = Agent(
        instructions=(
            load_personality()
            + "\n\n"
            + "Use the RMCC Voice Agent tools for live dashboard reads when available. "
            + "Never claim a task, project, idea, or note was changed until confirm_pending_action returns confirmed=true. "
            + "The add and update tools only prepare a preview. Ask Steve to confirm the exact preview, and call confirm_pending_action only after his next response explicitly approves that pending action. "
            + "Do not change money fields, delete records, or create external messages."
        ),
        tools=[
            get_today_focus,
            get_active_projects,
            get_stale_projects,
            get_overdue_tasks,
            get_outstanding_money,
            summarise_project,
            *build_write_tools(),
        ],
    )

    await session.start(agent=agent, room=ctx.room)
    await session.generate_reply(
        instructions=(
            "Greet Steve briefly as the RMCC Voice Agent. "
            "Say that live RMCC reads are enabled when the protected MCP connection is configured, "
            "and that updates always require confirmation."
        )
    )


if __name__ == "__main__":
    cli.run_app(server)
