from fastapi import APIRouter, Depends
from sqlmodel import Session, select, delete

from db import get_session, OnlineReader, now_iso
from schemas import OnlinePingIn, OnlineCountOut

router = APIRouter()

ONLINE_TIMEOUT_SECONDS = 90  # a reader is "online" if pinged within 90s


@router.post("/online/ping", response_model=OnlineCountOut, summary="Online Ping")
async def ping(payload: OnlinePingIn, session: Session = Depends(get_session)):
    # upsert reader row
    existing = session.get(OnlineReader, payload.client_id)
    now = now_iso()
    if existing:
        existing.path = payload.path
        existing.post_slug = payload.post_slug
        existing.last_seen = now
        session.add(existing)
    else:
        session.add(
            OnlineReader(
                client_id=payload.client_id,
                path=payload.path,
                post_slug=payload.post_slug,
                last_seen=now,
            )
        )
    session.commit()

    # count readers seen within timeout window
    from datetime import datetime, timezone, timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=ONLINE_TIMEOUT_SECONDS)).isoformat()
    count = session.exec(select(OnlineReader).where(OnlineReader.last_seen >= cutoff)).all()
    # garbage collect old rows occasionally
    if len(count) > 0 and len(count) % 50 == 0:
        session.exec(delete(OnlineReader).where(OnlineReader.last_seen < cutoff))
        session.commit()
    return OnlineCountOut(online_readers=len(count))


@router.get("/online/count", response_model=OnlineCountOut, summary="Online Count")
async def count(session: Session = Depends(get_session)):
    from datetime import datetime, timezone, timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=ONLINE_TIMEOUT_SECONDS)).isoformat()
    rows = session.exec(select(OnlineReader).where(OnlineReader.last_seen >= cutoff)).all()
    return OnlineCountOut(online_readers=len(rows))
