"""Aura-owned rules. Timestamps are immutable UTC instants; windows use local dates."""

from datetime import UTC, datetime, time, timedelta
import hashlib
import secrets
from uuid import uuid4
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from flask import current_app, session
from sqlalchemy import delete, func, select
from .db import DemoSession, Moment, MomentInfluence
from .errors import ApiError

FIXTURE_VERSION = "2026-09-09"
INFLUENCES = [
    "Work",
    "School",
    "Hobbies",
    "Family",
    "Love",
    "Friends",
    "Sleep",
    "Health",
    "Exercise",
]
FIXTURES = [
    ("A slower morning", "I left a little space before the day began."),
    ("Back outside", "A short walk gave me something new to notice."),
    ("A full afternoon", "There was a lot happening. I took it one thing at a time."),
    ("A familiar voice", "A made-up catch-up with a friend, and a reason to smile."),
    ("Room to rest", "I put a few things down and gave myself a quiet evening."),
    ("Something small", "Nothing big to report. Just a moment I wanted to keep."),
    ("Trying again", "The first try felt awkward. I was glad I gave it another go."),
    ("A little company", "A fictional dinner together, with time to listen."),
]


def now():
    clock = current_app.config["DEMO_CONFIG"].clock
    value = clock() if callable(clock) else datetime.now(UTC)
    if value.tzinfo is None:
        raise RuntimeError("The demo clock must be timezone aware")
    return value.astimezone(UTC)


def stamp(value):
    return (
        value.astimezone(UTC).isoformat(timespec="microseconds").replace("+00:00", "Z")
    )


def parse_stamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def timezone(value):
    try:
        return ZoneInfo(value).key
    except (ZoneInfoNotFoundError, ValueError):
        return "UTC"


def principal(transaction, *, required=True):
    identity = session.get("principal")
    item = transaction.get(DemoSession, identity) if isinstance(identity, str) else None
    if item is None or item.expires_at <= stamp(now()):
        if required:
            raise ApiError(
                401,
                "session_ended",
                "This temporary demo has ended. Start a fresh demo to continue.",
            )
        return None
    return item


def cleanup(transaction):
    return transaction.execute(
        delete(DemoSession).where(DemoSession.expires_at <= stamp(now()))
    ).rowcount


def create_principal(transaction, zone, bootstrap_nonce):
    cleanup(transaction)
    count = transaction.scalar(select(func.count()).select_from(DemoSession))
    if count >= 500:
        raise ApiError(
            429,
            "demo_capacity",
            "Aura is busy with other demos. Please try again later.",
        )
    instant = now()
    item = DemoSession(
        id=str(uuid4()),
        bootstrap_hash=hashlib.sha256(bootstrap_nonce.encode()).hexdigest(),
        generation=secrets.token_urlsafe(24),
        timezone=timezone(zone),
        created_at=stamp(instant),
        expires_at=stamp(instant + timedelta(hours=24)),
    )
    transaction.add(item)
    transaction.flush()
    seed(transaction, item, instant)
    return item


def seed(transaction, item, instant):
    local = instant.astimezone(ZoneInfo(item.timezone))
    # Always seed past local noons, including 24 dates and deliberate gaps in the last 30.
    offsets = [day for day in range(1, 30) if day not in {5, 11, 17, 23, 27}]
    for index, offset in enumerate(offsets):
        created = datetime.combine(
            local.date() - timedelta(days=offset), time(12), ZoneInfo(item.timezone)
        )
        title, body = FIXTURES[index % len(FIXTURES)]
        moment = Moment(
            id=str(uuid4()),
            demo_session_id=item.id,
            mood=(index % 5) + 1,
            title=title,
            body=body,
            created_at=stamp(created),
            updated_at=stamp(created),
            version=1,
        )
        moment.influences = [
            MomentInfluence(influence=value)
            for value in sorted({(index % 9) + 1, ((index + 3) % 9) + 1})
        ]
        transaction.add(moment)
    transaction.flush()


def serialize(moment):
    return {
        "id": moment.id,
        "mood": moment.mood,
        "influences": sorted(value.influence for value in moment.influences),
        "title": moment.title,
        "body": moment.body,
        "createdAt": moment.created_at,
        "updatedAt": moment.updated_at,
        "version": moment.version,
    }


def owned(transaction, owner, identity):
    item = transaction.scalar(
        select(Moment).where(Moment.id == identity, Moment.demo_session_id == owner.id)
    )
    if item is None:
        raise ApiError(
            404, "moment_missing", "This moment is not available in this demo."
        )
    return item


def calendar_window(days, owner, instant):
    zone = ZoneInfo(owner.timezone)
    end = instant.astimezone(zone).date()
    start = end - timedelta(days=days - 1)
    lower = datetime.combine(start, time.min, zone).astimezone(UTC)
    return start, end, lower, instant
