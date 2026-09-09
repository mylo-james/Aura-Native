"""Owner-scoped routes, transactional mutations and honest calendar summaries."""

import hashlib
import json
import secrets
from uuid import UUID, uuid4

from flask import current_app, jsonify, request, session
from flask_wtf.csrf import generate_csrf
from itsdangerous import BadSignature, URLSafeSerializer
from sqlalchemy import and_, func, or_, select
from sqlalchemy.orm import Session

from .db import DemoSession, IdempotencyOperation, Moment, MomentInfluence, atomic, db
from . import domain
from .errors import ApiError
from .schemas import MomentUpdate, MomentWrite, ResetDemo, StartDemo


def dto(model):
    value = request.get_json()
    if not isinstance(value, dict):
        raise ApiError(400, "json_object", "Send a JSON object for this action.")
    return model.model_validate(value)


def demo_status(owner):
    return {
        "active": owner is not None,
        "expiresAt": owner.expires_at if owner else None,
        "timezone": owner.timezone if owner else None,
        "fixtureVersion": domain.FIXTURE_VERSION,
        "generation": owner.generation if owner else None,
        "csrfToken": generate_csrf(),
    }


def attach(owner, nonce):
    session.clear()
    session["principal"] = owner.id
    session["bootstrap_nonce"] = nonce
    session.permanent = True
    # CSRFProtect caches the validated request token on g; generation uses new session state.
    from flask import g

    g.pop("csrf_token", None)


def operation_result(transaction, owner, operation, method, target, fingerprint):
    previous = transaction.get(IdempotencyOperation, (owner.id, operation))
    if previous is None:
        return None
    if (previous.method, previous.target_id, previous.payload_hash) != (
        method,
        target,
        fingerprint,
    ):
        raise ApiError(
            409,
            "operation_conflict",
            "This save was already used with different content. Open your moments to check what was saved.",
        )
    return json.loads(previous.response_json)


def write_moment(identity=None):
    model = dto(MomentUpdate if identity else MomentWrite)
    payload = model.model_dump()
    operation = payload.pop("operationId")
    method, target = ("PUT", identity) if identity else ("POST", "")
    fingerprint = hashlib.sha256(
        json.dumps(
            payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False
        ).encode()
    ).hexdigest()
    with atomic() as transaction:
        owner = domain.principal(transaction)
        previous = operation_result(
            transaction, owner, operation, method, target, fingerprint
        )
        if previous is not None:
            return jsonify(previous), 200
        if identity:
            moment = domain.owned(transaction, owner, identity)
            if moment.version != model.expectedVersion:
                raise ApiError(
                    409,
                    "version_conflict",
                    "This moment has changed since you opened it. Your edits are still here.",
                )
            moment.version += 1
            # Flush removals before inserting an influence that was already selected.
            moment.influences.clear()
            transaction.flush()
        else:
            count = transaction.scalar(
                select(func.count())
                .select_from(Moment)
                .where(Moment.demo_session_id == owner.id)
            )
            if count >= 100:
                raise ApiError(
                    429,
                    "moment_capacity",
                    "This demo holds 100 moments. Remove one or reset your demo to add another.",
                )
            moment = Moment(
                id=str(uuid4()),
                demo_session_id=owner.id,
                created_at=domain.stamp(domain.now()),
                version=1,
            )
            transaction.add(moment)
        moment.mood, moment.title, moment.body = model.mood, model.title, model.body
        moment.updated_at = domain.stamp(domain.now())
        moment.influences = [
            MomentInfluence(influence=value) for value in model.influences
        ]
        transaction.flush()
        result = domain.serialize(moment)
        transaction.add(
            IdempotencyOperation(
                demo_session_id=owner.id,
                operation_id=operation,
                method=method,
                target_id=target,
                payload_hash=fingerprint,
                response_json=json.dumps(result),
            )
        )
    return jsonify(result), 200 if identity else 201


def register_api(app, limiter):
    principal_key = lambda: session.get("principal") or f"peer:{request.remote_addr}"
    entry_peer = limiter.shared_limit("5 per minute", scope="demo_entry_peer")
    entry_global = limiter.shared_limit(
        "30 per minute", scope="demo_entry_global", key_func=lambda: "global"
    )
    write_owner = limiter.shared_limit(
        "30 per minute", scope="moment_writes", key_func=principal_key
    )
    write_global = limiter.shared_limit(
        "300 per minute", scope="moment_writes_global", key_func=lambda: "global"
    )
    reads = limiter.shared_limit(
        "120 per minute", scope="demo_reads", key_func=principal_key
    )

    @app.get("/api/health")
    def health():
        from .app import assert_revision

        assert_revision()
        return jsonify(status="ok", schemaVersion="1")

    @app.get("/api/demo")
    @reads
    def get_demo():
        with Session(db.engine) as transaction:
            owner = domain.principal(transaction, required=False)
            if owner is None and session.get("principal"):
                session.clear()
            session.setdefault("bootstrap_nonce", secrets.token_urlsafe(32))
            return jsonify(demo_status(owner))

    @app.post("/api/demo")
    @entry_peer
    @entry_global
    def start_demo():
        model = dto(StartDemo)
        nonce = session.get("bootstrap_nonce")
        if not isinstance(nonce, str):
            raise ApiError(403, "csrf", "Open Aura before starting the demo.")
        fingerprint = hashlib.sha256(nonce.encode()).hexdigest()
        with atomic() as transaction:
            owner = domain.principal(transaction, required=False)
            if owner is None:
                owner = transaction.scalar(
                    select(DemoSession).where(
                        DemoSession.bootstrap_hash == fingerprint,
                        DemoSession.expires_at > domain.stamp(domain.now()),
                    )
                )
            new = owner is None
            if new:
                owner = domain.create_principal(transaction, model.timezone, nonce)
            # Commit before emitting a credential for this identity.
            transaction.flush()
        if session.get("principal") != owner.id:
            attach(owner, nonce)
        return jsonify(demo_status(owner)), 201 if new else 200

    @app.post("/api/demo/reset")
    @entry_peer
    @entry_global
    def reset_demo():
        model = dto(ResetDemo)
        if not model.confirm:
            raise ApiError(
                400, "confirmation", "Confirm the reset before starting fresh."
            )
        nonce = secrets.token_urlsafe(32)
        with atomic() as transaction:
            previous = domain.principal(transaction)
            zone = previous.timezone
            transaction.delete(previous)
            transaction.flush()
            owner = domain.create_principal(transaction, zone, nonce)
        attach(owner, nonce)
        return jsonify(demo_status(owner)), 201

    @app.get("/api/moments")
    @reads
    def list_moments():
        if set(request.args) - {"limit", "cursor"} or any(
            len(request.args.getlist(key)) != 1 for key in request.args
        ):
            raise ApiError(
                400, "query", "Use a single limit and cursor for this request."
            )
        limit_string = request.args.get("limit", "20")
        if (
            not limit_string.isascii()
            or not limit_string.isdecimal()
            or not 1 <= int(limit_string) <= 50
        ):
            raise ApiError(400, "limit", "The page size must be between 1 and 50.")
        limit = int(limit_string)
        signer = URLSafeSerializer(current_app.secret_key, salt="aura-cursor-v1")
        with Session(db.engine) as transaction:
            owner = domain.principal(transaction)
            query = select(Moment).where(Moment.demo_session_id == owner.id)
            cursor = request.args.get("cursor")
            if cursor:
                try:
                    if len(cursor) > 1024:
                        raise ValueError()
                    anchor = signer.loads(cursor)
                    if (
                        not isinstance(anchor, dict)
                        or set(anchor) != {"generation", "at", "id"}
                        or anchor["generation"] != owner.generation
                    ):
                        raise ValueError()
                    if (
                        domain.stamp(domain.parse_stamp(anchor["at"])) != anchor["at"]
                        or str(UUID(anchor["id"])) != anchor["id"]
                    ):
                        raise ValueError()
                except (BadSignature, ValueError, TypeError, KeyError):
                    raise ApiError(
                        400, "cursor", "This page cursor is not valid for this demo."
                    ) from None
                query = query.where(
                    or_(
                        Moment.created_at < anchor["at"],
                        and_(
                            Moment.created_at == anchor["at"], Moment.id < anchor["id"]
                        ),
                    )
                )
            items = list(
                transaction.scalars(
                    query.order_by(Moment.created_at.desc(), Moment.id.desc()).limit(
                        limit + 1
                    )
                )
            )
            more = len(items) > limit
            items = items[:limit]
            cursor = (
                signer.dumps(
                    {
                        "generation": owner.generation,
                        "at": items[-1].created_at,
                        "id": items[-1].id,
                    }
                )
                if more
                else None
            )
            return jsonify(
                items=[domain.serialize(item) for item in items], nextCursor=cursor
            )

    @app.post("/api/moments")
    @write_owner
    @write_global
    def create_moment():
        return write_moment()

    @app.get("/api/moments/<identity>")
    @reads
    def get_moment(identity):
        with Session(db.engine) as transaction:
            return jsonify(
                domain.serialize(
                    domain.owned(transaction, domain.principal(transaction), identity)
                )
            )

    @app.put("/api/moments/<identity>")
    @write_owner
    @write_global
    def update_moment(identity):
        return write_moment(identity)

    @app.delete("/api/moments/<identity>")
    @write_owner
    @write_global
    def delete_moment(identity):
        with atomic() as transaction:
            owner = domain.principal(transaction)
            transaction.delete(domain.owned(transaction, owner, identity))
        return "", 204

    @app.get("/api/patterns")
    @reads
    def patterns():
        if (
            set(request.args) - {"days"}
            or len(request.args.getlist("days")) > 1
            or request.args.get("days", "7") not in {"7", "30"}
        ):
            raise ApiError(400, "days", "Choose a 7-day or 30-day window.")
        days = int(request.args.get("days", "7"))
        with Session(db.engine) as transaction:
            owner = domain.principal(transaction)
            start, end, lower, upper = domain.calendar_window(days, owner, domain.now())
            items = list(
                transaction.scalars(
                    select(Moment).where(
                        Moment.demo_session_id == owner.id,
                        Moment.created_at >= domain.stamp(lower),
                        Moment.created_at <= domain.stamp(upper),
                    )
                )
            )
            count = len(items)
            percent = lambda value: round(value * 100 / count, 2) if count else 0
            mood_counts = [
                sum(item.mood == value for item in items) for value in range(1, 6)
            ]
            influence_counts = [
                sum(
                    any(influence.influence == value for influence in item.influences)
                    for item in items
                )
                for value in range(1, 10)
            ]
            return jsonify(
                days=days,
                timezone=owner.timezone,
                startDate=str(start),
                endDate=str(end),
                count=count,
                denominator=count,
                moods=[
                    {"mood": index + 1, "count": value, "percent": percent(value)}
                    for index, value in enumerate(mood_counts)
                ],
                influences=[
                    {
                        "id": index + 1,
                        "name": domain.INFLUENCES[index],
                        "count": value,
                        "percent": percent(value),
                    }
                    for index, value in enumerate(influence_counts)
                ],
                state="empty"
                if count == 0
                else "insufficient"
                if count == 1
                else "ready",
            )
