from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from datetime import date, datetime, timedelta

from app.deps import get_db
from app.auth_dev import get_current_user
from app.models import User
from app.db import Base
import sqlalchemy as sa
from app.auth import get_current_user


router = APIRouter(prefix="/habits", tags=["habits"])


# ---------- SQLAlchemy Models (kept here for simplicity) ----------
class Habit(Base):
    __tablename__ = "habits"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    user_id = sa.Column(sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    name = sa.Column(sa.String(120), nullable=False)
    goal = sa.Column(sa.String(120), nullable=False)
    active = sa.Column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    created_at = sa.Column(sa.DateTime, nullable=False, server_default=sa.text("now()"))


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = sa.Column(sa.Integer, primary_key=True, index=True)
    habit_id = sa.Column(sa.Integer, sa.ForeignKey("habits.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id = sa.Column(sa.Integer, sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    date = sa.Column(sa.Date, nullable=False, index=True)
    done = sa.Column(sa.Boolean, nullable=False, server_default=sa.text("true"))
    created_at = sa.Column(sa.DateTime, nullable=False, server_default=sa.text("now()"))

    __table_args__ = (
        sa.UniqueConstraint("habit_id", "date", name="uq_habit_logs_habit_date"),
    )


# ---------- Schemas ----------
class HabitCreate(BaseModel):
    name: str
    goal: str
    active: bool = True


class HabitUpdate(BaseModel):
    name: str | None = None
    goal: str | None = None
    active: bool | None = None


class ToggleIn(BaseModel):
    date: str  # "YYYY-MM-DD"


class HabitOut(BaseModel):
    id: int
    name: str
    goal: str
    active: bool
    created_at: str
    completed_dates: list[str]


# ---------- Helpers ----------
def parse_ymd(s: str) -> date:
    try:
        y, m, d = s.split("-")
        return date(int(y), int(m), int(d))
    except Exception:
        raise HTTPException(status_code=422, detail="Invalid date format. Use YYYY-MM-DD.")


def last_n_days(n: int) -> list[date]:
    today = date.today()
    return [today - timedelta(days=i) for i in range(n)]


# ---------- Routes ----------
@router.get("", response_model=list[HabitOut])
def list_habits(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    habits = list(
        db.scalars(
            select(Habit)
            .where(Habit.user_id == user.id)
            .order_by(Habit.created_at.desc())
        ).all()
    )

    if not habits:
        return []

    habit_ids = [h.id for h in habits]
    since = date.today() - timedelta(days=60)

    logs = db.execute(
        sa.text(
            """
            SELECT habit_id, date, done
            FROM habit_logs
            WHERE user_id = :uid
              AND habit_id = ANY(:hids)
              AND date >= :since
              AND done = true
            """
        ),
        {"uid": user.id, "hids": habit_ids, "since": since},
    ).fetchall()

    done_map: dict[int, list[str]] = {}
    for hid, d, done in logs:
        done_map.setdefault(int(hid), []).append(d.isoformat())

    out: list[HabitOut] = []
    for h in habits:
        out.append(
            HabitOut(
                id=h.id,
                name=h.name,
                goal=h.goal,
                active=bool(h.active),
                created_at=h.created_at.isoformat() if h.created_at else datetime.utcnow().isoformat(),
                completed_dates=sorted(done_map.get(h.id, [])),
            )
        )
    return out


@router.post("", response_model=HabitOut)
def create_habit(payload: HabitCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    name = payload.name.strip()
    goal = payload.goal.strip()
    if not name:
        raise HTTPException(status_code=422, detail="name is required")
    if not goal:
        raise HTTPException(status_code=422, detail="goal is required")

    h = Habit(user_id=user.id, name=name, goal=goal, active=payload.active)
    db.add(h)
    db.commit()
    db.refresh(h)

    return HabitOut(
        id=h.id,
        name=h.name,
        goal=h.goal,
        active=bool(h.active),
        created_at=h.created_at.isoformat() if h.created_at else datetime.utcnow().isoformat(),
        completed_dates=[],
    )


@router.patch("/{habit_id}", response_model=HabitOut)
def update_habit(habit_id: int, payload: HabitUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    h = db.scalar(select(Habit).where(Habit.id == habit_id, Habit.user_id == user.id))
    if not h:
        raise HTTPException(status_code=404, detail="Habit not found")

    if payload.name is not None:
        n = payload.name.strip()
        if not n:
            raise HTTPException(status_code=422, detail="name cannot be empty")
        h.name = n

    if payload.goal is not None:
        g = payload.goal.strip()
        if not g:
            raise HTTPException(status_code=422, detail="goal cannot be empty")
        h.goal = g

    if payload.active is not None:
        h.active = payload.active

    db.commit()
    db.refresh(h)

    logs = db.execute(
        sa.text(
            """
            SELECT date
            FROM habit_logs
            WHERE user_id = :uid AND habit_id = :hid AND done = true
            ORDER BY date ASC
            """
        ),
        {"uid": user.id, "hid": h.id},
    ).fetchall()

    return HabitOut(
        id=h.id,
        name=h.name,
        goal=h.goal,
        active=bool(h.active),
        created_at=h.created_at.isoformat() if h.created_at else datetime.utcnow().isoformat(),
        completed_dates=[r[0].isoformat() for r in logs],
    )


@router.delete("/{habit_id}")
def delete_habit(habit_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    h = db.scalar(select(Habit).where(Habit.id == habit_id, Habit.user_id == user.id))
    if not h:
        raise HTTPException(status_code=404, detail="Habit not found")
    db.delete(h)
    db.commit()
    return {"ok": True}


@router.post("/{habit_id}/toggle")
def toggle_habit(habit_id: int, payload: ToggleIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    h = db.scalar(select(Habit).where(Habit.id == habit_id, Habit.user_id == user.id))
    if not h:
        raise HTTPException(status_code=404, detail="Habit not found")

    d = parse_ymd(payload.date)

    row = db.execute(
        sa.text(
            """
            SELECT id, done
            FROM habit_logs
            WHERE user_id = :uid AND habit_id = :hid AND date = :d
            """
        ),
        {"uid": user.id, "hid": habit_id, "d": d},
    ).fetchone()

    if row is None:
        db.execute(
            sa.text(
                """
                INSERT INTO habit_logs (habit_id, user_id, date, done, created_at)
                VALUES (:hid, :uid, :d, true, now())
                """
            ),
            {"hid": habit_id, "uid": user.id, "d": d},
        )
        db.commit()
        return {"habit_id": habit_id, "date": d.isoformat(), "done": True}

    log_id, done = int(row[0]), bool(row[1])
    new_done = not done

    db.execute(
        sa.text("UPDATE habit_logs SET done = :done WHERE id = :id"),
        {"done": new_done, "id": log_id},
    )
    db.commit()
    return {"habit_id": habit_id, "date": d.isoformat(), "done": new_done}
