from fastapi import APIRouter

router = APIRouter()


@router.get("/health", summary="Health")
async def health():
    return {"status": "ok"}
