import os
import uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from deps import require_owner

router = APIRouter()

MAX_SIZE = 8 * 1024 * 1024  # 8MB
ALLOWED = {"image/png", "image/jpeg", "image/gif", "image/webp"}


@router.post("/admin/uploads", summary="Upload Image")
async def upload(file: UploadFile = File(...), owner=Depends(require_owner)):
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=415, detail="不支持的图片类型")
    data = await file.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=413, detail="图片超过 8MB 限制")
    ext = file.filename.rsplit(".", 1)[-1] if file.filename else "png"
    name = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs("uploads", exist_ok=True)
    with open(os.path.join("uploads", name), "wb") as f:
        f.write(data)
    # URL path (served via StaticFiles mounted at /uploads under root_path /api)
    return {"url": f"/api/uploads/{name}", "filename": name}
