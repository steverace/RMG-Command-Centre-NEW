from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any

from rmcc_api import call_tool, configured

ROOT = Path(__file__).resolve().parents[1]
MOCK_DATA = ROOT / "mock-data"


def _load_json(name: str) -> list[dict[str, Any]]:
    path = MOCK_DATA / name
    with path.open("r", encoding="utf-8-sig") as handle:
        return json.load(handle)


projects = _load_json("projects.json")
tasks = _load_json("tasks.json")
money = _load_json("money.json")
ideas = _load_json("ideas.json")


def _using_real_rmcc() -> bool:
    return configured()


def _currency(value: int | float) -> str:
    return f"£{value:,.0f}"


def _project_name(project_id: str, source_projects: list[dict[str, Any]] | None = None) -> str:
    records = source_projects if source_projects is not None else projects
    project = next((item for item in records if item.get("id") == project_id), None)
    return str(project.get("name", project_id)) if project else project_id


def _find_project(project_name: str, source_projects: list[dict[str, Any]] | None = None) -> dict[str, Any] | None:
    needle = project_name.strip().lower()
    if not needle:
        return None

    records = source_projects if source_projects is not None else projects
    return next(
        (
            project
            for project in records
            if str(project.get("id", "")).lower() == needle
            or str(project.get("name", "")).lower() == needle
            or needle in str(project.get("name", "")).lower()
            or str(project.get("name", "")).lower() in needle
        ),
        None,
    )


def _real_projects() -> list[dict[str, Any]]:
    data = call_tool("list_projects", {"limit": 50})
    return data if isinstance(data, list) else []


def _real_tasks() -> list[dict[str, Any]]:
    data = call_tool("list_tasks", {"limit": 50, "include_completed": False})
    return data if isinstance(data, list) else []


def _real_metrics(project_records: list[dict[str, Any]]) -> dict[str, dict[str, Any]]:
    return {
        str(project.get("id")): project.get("metrics") or {}
        for project in project_records
        if project.get("id")
    }


def _real_overdue_tasks(project_records: list[dict[str, Any]], task_records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    today = date.today().isoformat()
    return [
        {
            "id": task.get("id"),
            "project": _project_name(str(task.get("project_id")), project_records),
            "title": task.get("title", "Untitled task"),
            "due": task.get("due_date"),
        }
        for task in task_records
        if task.get("status") != "complete" and task.get("due_date") and str(task["due_date"]) < today
    ]


def _real_outstanding_money(project_records: list[dict[str, Any]]) -> dict[str, Any]:
    items: list[dict[str, Any]] = []
    for project in project_records:
        metrics = project.get("metrics") or {}
        amount = metrics.get("outstanding_balance")
        if amount is None:
            amount = (project.get("amount_charged") or 0) - (project.get("amount_paid") or 0)
        if project.get("payment_status") in {"invoiced", "part_paid", "overdue"} and amount > 0:
            items.append(
                {
                    "id": project.get("id"),
                    "client": project.get("name", "Unknown project"),
                    "project": project.get("name", "Unknown project"),
                    "amount": amount,
                    "formattedAmount": _currency(amount),
                    "due": project.get("payment_due_date") or "date not set",
                }
            )

    total = sum(float(item["amount"]) for item in items)
    return {"total": total, "formattedTotal": _currency(total), "items": items}


def getTodayFocus() -> dict[str, Any]:
    if _using_real_rmcc():
        remote_projects = _real_projects()
        remote_tasks = _real_tasks()
        overdue = _real_overdue_tasks(remote_projects, remote_tasks)
        outstanding = _real_outstanding_money(remote_projects)
        metrics = _real_metrics(remote_projects)
        stale = [
            project
            for project in remote_projects
            if project.get("status") == "active"
            and (metrics.get(str(project.get("id")), {}).get("days_since_last_worked") or 0) >= 10
        ]
        next_steps = [
            f"Resolve overdue task: {task['title']}" for task in overdue[:2]
        ] + [
            f"Review outstanding balance on {item['project']}" for item in outstanding["items"][:2]
        ]
        if not next_steps:
            next_steps = [
                f"Choose the next action for {project.get('name')}"
                for project in remote_projects
                if project.get("status") == "active" and not project.get("next_action")
            ][:2]
        if not next_steps:
            next_steps = ["Review active projects and keep the next action current."]
        return {
            "primary": "Clear overdue work and outstanding money before opening another front.",
            "reasons": [
                f"{outstanding['formattedTotal']} is outstanding",
                f"{len(overdue)} overdue tasks need attention",
                f"{len(stale)} active projects are going stale",
            ],
            "nextSteps": next_steps,
        }

    overdue = getOverdueTasks()
    outstanding = getOutstandingMoney()
    stale = getStaleProjects()
    return {
        "primary": "Collect outstanding money and unblock Queen Bee.",
        "reasons": [
            f"{outstanding['formattedTotal']} is outstanding",
            f"{len(overdue)} overdue tasks need attention",
            f"{len(stale)} active projects are going stale",
        ],
        "nextSteps": [
            "Chase Acme Fitness before opening another new front.",
            "Approve the Queen Bee hero direction.",
            "Finish the safe RMCC API action whitelist.",
        ],
    }


def getActiveProjects() -> list[dict[str, Any]]:
    if _using_real_rmcc():
        remote_projects = _real_projects()
        metrics = _real_metrics(remote_projects)
        return [
            {
                "id": project.get("id"),
                "name": project.get("name"),
                "priority": project.get("priority"),
                "lastUpdatedDaysAgo": metrics.get(str(project.get("id")), {}).get("days_since_last_worked"),
                "summary": project.get("next_action") or project.get("blockers") or "No next action recorded.",
            }
            for project in remote_projects
            if project.get("status") == "active"
        ]

    return [
        {
            "id": project["id"],
            "name": project["name"],
            "priority": project["priority"],
            "lastUpdatedDaysAgo": project["lastUpdatedDaysAgo"],
            "summary": project["summary"],
        }
        for project in projects
        if project["status"] == "active"
    ]


def getStaleProjects() -> list[dict[str, Any]]:
    if _using_real_rmcc():
        remote_projects = _real_projects()
        metrics = _real_metrics(remote_projects)
        return [
            {
                "id": project.get("id"),
                "name": project.get("name"),
                "lastUpdatedDaysAgo": metrics.get(str(project.get("id")), {}).get("days_since_last_worked"),
                "reason": f"{metrics.get(str(project.get('id')), {}).get('days_since_last_worked')} days since the last update",
            }
            for project in remote_projects
            if project.get("status") == "active"
            and (metrics.get(str(project.get("id")), {}).get("days_since_last_worked") or 0) >= 10
        ]

    return [
        {
            "id": project["id"],
            "name": project["name"],
            "lastUpdatedDaysAgo": project["lastUpdatedDaysAgo"],
            "reason": f"{project['lastUpdatedDaysAgo']} days since the last update",
        }
        for project in projects
        if project["status"] == "active" and project["lastUpdatedDaysAgo"] >= 10
    ]


def getOverdueTasks() -> list[dict[str, Any]]:
    if _using_real_rmcc():
        return _real_overdue_tasks(_real_projects(), _real_tasks())

    return [
        {
            "id": task["id"],
            "project": _project_name(task["projectId"]),
            "title": task["title"],
            "due": task["due"],
        }
        for task in tasks
        if task["overdue"]
    ]


def getOutstandingMoney() -> dict[str, Any]:
    if _using_real_rmcc():
        return _real_outstanding_money(_real_projects())

    total = sum(item["amount"] for item in money)
    return {
        "total": total,
        "formattedTotal": _currency(total),
        "items": [
            {
                "id": item["id"],
                "client": item["client"],
                "project": _project_name(item["projectId"]),
                "amount": item["amount"],
                "formattedAmount": _currency(item["amount"]),
                "due": item["due"],
            }
            for item in money
        ],
    }


def addIdea(text: str) -> dict[str, Any]:
    clean_text = text.strip()
    if _using_real_rmcc():
        created = call_tool(
            "create_idea",
            {
                "name": clean_text,
                "description": "Captured by RMCC Voice Agent.",
                "category": "voice",
                "confirmed": True,
            },
        )
        return {"ok": True, "idea": created[0] if isinstance(created, list) and created else created}

    idea = {
        "id": f"idea-{len(ideas) + 1}",
        "text": clean_text,
        "createdAt": datetime.now().isoformat(timespec="seconds"),
    }
    ideas.insert(0, idea)
    return idea


def addTask(project_name: str, title: str, notes: str | None = None, due_date: str | None = None, priority: str | None = None) -> dict[str, Any]:
    if _using_real_rmcc():
        remote_projects = _real_projects()
        project = _find_project(project_name, remote_projects)
        if not project:
            return {"ok": False, "error": f"Project not found: {project_name}"}
        created = call_tool(
            "create_task",
            {
                "title": title.strip(),
                "project_id": project.get("id"),
                "notes": notes.strip() if notes else None,
                "due_date": due_date,
                "priority": priority or "medium",
                "requires_manual": True,
                "ready_for_ai": False,
                "confirmed": True,
            },
        )
        return {"ok": True, "project": project.get("name"), "task": created[0] if isinstance(created, list) and created else created}

    project = _find_project(project_name)
    if not project:
        return {"ok": False, "error": f"Project not found: {project_name}"}
    task = {
        "id": f"task-{len(tasks) + 1}",
        "projectId": project["id"],
        "title": title.strip(),
        "due": "unscheduled",
        "overdue": False,
    }
    tasks.append(task)
    project["lastUpdatedDaysAgo"] = 0
    return {"ok": True, "project": project["name"], "task": task}


def updateTask(task_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    if _using_real_rmcc():
        arguments = {key: value for key, value in patch.items() if value is not None}
        arguments.update({"id": task_id, "confirmed": True})
        updated = call_tool("update_task", arguments)
        return {"ok": True, "task": updated[0] if isinstance(updated, list) and updated else updated}
    task = next((item for item in tasks if item.get("id") == task_id), None)
    if not task:
        return {"ok": False, "error": f"Task not found: {task_id}"}
    task.update({key: value for key, value in patch.items() if value is not None})
    return {"ok": True, "task": task}


def updateProject(project_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    if _using_real_rmcc():
        remote_projects = _real_projects()
        project = _find_project(project_id, remote_projects)
        if not project:
            return {"ok": False, "error": f"Project not found: {project_id}"}
        resolved_id = project.get("id")
        arguments = {key: value for key, value in patch.items() if value is not None}
        arguments.update({"id": resolved_id, "confirmed": True})
        updated = call_tool("update_project", arguments)
        return {"ok": True, "project": updated[0] if isinstance(updated, list) and updated else updated}
    project = next((item for item in projects if item.get("id") == project_id), None)
    if not project:
        return {"ok": False, "error": f"Project not found: {project_id}"}
    project.update({key: value for key, value in patch.items() if value is not None})
    return {"ok": True, "project": project}


def addProjectNote(project_name: str, note: str) -> dict[str, Any]:
    if _using_real_rmcc():
        project = _find_project(project_name, _real_projects())
        if not project:
            return {"ok": False, "error": f"Project not found: {project_name}"}
        result = call_tool(
            "append_project_context",
            {
                "project_id": project.get("id"),
                "summary": note.strip(),
                "source": "rmcc-voice-agent",
                "confirmed": True,
            },
        )
        return {"ok": True, "project": project.get("name"), "note": note.strip(), "audit": result}

    project = _find_project(project_name)
    if not project:
        return {"ok": False, "error": f"Project not found: {project_name}"}
    clean_note = note.strip()
    project.setdefault("notes", []).insert(0, clean_note)
    project["lastUpdatedDaysAgo"] = 0
    return {"ok": True, "project": project["name"], "note": clean_note}


def summariseProject(project_name: str) -> dict[str, Any]:
    if _using_real_rmcc():
        remote_projects = _real_projects()
        project = _find_project(project_name, remote_projects)
        if not project:
            return {"ok": False, "error": f"Project not found: {project_name}"}
        remote_tasks = [task for task in _real_tasks() if task.get("project_id") == project.get("id")]
        metrics = project.get("metrics") or {}
        overdue = _real_overdue_tasks(remote_projects, remote_tasks)
        return {
            "ok": True,
            "id": project.get("id"),
            "name": project.get("name"),
            "priority": project.get("priority"),
            "summary": project.get("next_action") or project.get("blockers") or "No next action recorded.",
            "lastUpdatedDaysAgo": metrics.get("days_since_last_worked"),
            "taskCount": len(remote_tasks),
            "overdueTaskCount": len([task for task in overdue if task.get("project") == project.get("name")]),
            "outstandingBalance": metrics.get("outstanding_balance") or 0,
        }

    project = _find_project(project_name)
    if not project:
        return {"ok": False, "error": f"Project not found: {project_name}"}
    project_tasks = [task for task in tasks if task["projectId"] == project["id"]]
    overdue = [task for task in project_tasks if task["overdue"]]
    return {
        "ok": True,
        "name": project["name"],
        "priority": project["priority"],
        "summary": project["summary"],
        "lastUpdatedDaysAgo": project["lastUpdatedDaysAgo"],
        "taskCount": len(project_tasks),
        "overdueTaskCount": len(overdue),
        "notes": project.get("notes", [])[:3],
    }
