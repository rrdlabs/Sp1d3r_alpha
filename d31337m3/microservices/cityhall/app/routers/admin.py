import math
import uuid as _uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, hash_password, require_admin
from app.database import get_session
from app.models import User
from app.schemas import (
    AdminCreateUserRequest,
    AdminUserUpdate,
    PaginatedUsers,
    SuspendRequest,
    UserAdmin,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users")
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> PaginatedUsers:
    count_q = select(func.count(User.id))
    total = (await session.execute(count_q)).scalar_one()

    q = select(User).offset((page - 1) * page_size).limit(page_size).order_by(User.created_at.desc())
    rows = (await session.execute(q)).scalars().all()

    items = [_user_to_admin(u) for u in rows]
    return PaginatedUsers(items=items, total=total, page=page, page_size=page_size)


@router.get("/users/search")
async def search_users(
    q: str = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> PaginatedUsers:
    pattern = f"%{q}%"
    where_clause = or_(
        User.username.ilike(pattern),
        User.email.ilike(pattern),
        User.first_name.ilike(pattern),
        User.last_name.ilike(pattern),
        User.referral_code.ilike(pattern),
    )

    count_q = select(func.count(User.id)).where(where_clause)
    total = (await session.execute(count_q)).scalar_one()

    stmt = (
        select(User)
        .where(where_clause)
        .offset((page - 1) * page_size)
        .limit(page_size)
        .order_by(User.created_at.desc())
    )
    rows = (await session.execute(stmt)).scalars().all()

    items = [_user_to_admin(u) for u in rows]
    return PaginatedUsers(items=items, total=total, page=page, page_size=page_size)


@router.get("/users/{user_id}")
async def get_user(
    user_id: str,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> UserAdmin:
    from uuid import UUID

    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return _user_to_admin(user)


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    updates: AdminUserUpdate,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> UserAdmin:
    from uuid import UUID

    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    for field, value in updates.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    await session.flush()
    return _user_to_admin(user)


@router.delete("/users/{user_id}", status_code=204)
async def delete_user(
    user_id: str,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    from uuid import UUID

    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await session.delete(user)


@router.post("/users/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    body: SuspendRequest = SuspendRequest(),
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    from uuid import UUID

    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_suspended = True
    user.suspended_reason = body.reason
    await session.flush()
    return {"status": "suspended", "user_id": str(user_id)}


@router.post("/users/{user_id}/unsuspend")
async def unsuspend_user(
    user_id: str,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    from uuid import UUID

    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_suspended = False
    user.suspended_reason = None
    await session.flush()
    return {"status": "unsuspended", "user_id": str(user_id)}


# ---------------------------------------------------------------------------
# Node operator management
# ---------------------------------------------------------------------------

@router.get("/node-operators")
async def list_node_operators(
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(User).where(User.is_nodeop == True).order_by(User.created_at.desc())  # noqa: E712
    )
    users = result.scalars().all()
    return {"node_operators": [_user_to_admin(u) for u in users], "count": len(users)}


@router.post("/users/{user_id}/set-nodeop")
async def set_node_operator(
    user_id: str,
    body: dict = {},
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    from uuid import UUID

    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_nodeop = True
    if body.get("node_pubkey"):
        user.ed25519_public_key = bytes.fromhex(body["node_pubkey"])
    await session.flush()
    return {"status": "nodeop_set", "user_id": str(user.id), "is_nodeop": True}


@router.post("/users/{user_id}/remove-nodeop")
async def remove_node_operator(
    user_id: str,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    from uuid import UUID

    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID")

    result = await session.execute(select(User).where(User.id == uid))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_nodeop = False
    await session.flush()
    return {"status": "nodeop_removed", "user_id": str(user.id), "is_nodeop": False}


_invitation_tokens: dict[str, dict] = {}


@router.get("/users/create-token")
async def create_invitation_token(
    _: User = Depends(require_admin),
):
    token = str(_uuid.uuid4())
    _invitation_tokens[token] = {"created_by": "admin"}
    return {"token": token}


@router.post("/users", status_code=201)
async def admin_create_user(
    body: AdminCreateUserRequest,
    _: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
) -> UserAdmin:
    existing = await session.execute(select(User).where(User.username == body.username))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken")
    existing = await session.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Email already registered")

    user = User(
        username=body.username,
        email=body.email,
        password_hash=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        dob=body.dob,
        is_nodeop=body.is_nodeop,
        is_tech_op=body.is_tech_op,
        is_chat_op=body.is_chat_op,
        is_user=body.is_user,
        is_employee=body.is_employee,
        is_admin=body.is_admin,
        is_super_admin=body.is_super_admin,
    )
    session.add(user)
    await session.flush()
    return _user_to_admin(user)


def _user_to_admin(u: User) -> UserAdmin:
    return UserAdmin(
        id=u.id,
        username=u.username,
        first_name=u.first_name,
        last_name=u.last_name,
        email=u.email,
        dob=u.dob,
        avatar_url=u.avatar_url,
        bio=u.bio,
        is_nodeop=u.is_nodeop,
        is_tech_op=u.is_tech_op,
        is_chat_op=u.is_chat_op,
        is_user=u.is_user,
        is_employee=u.is_employee,
        is_admin=u.is_admin,
        is_super_admin=u.is_super_admin,
        is_suspended=u.is_suspended,
        wallet_address=u.wallet_address,
        signup_date=u.signup_date,
        founder_subscript=u.founder_subscript,
        referral_code=u.referral_code,
        referred_by_code=u.referred_by_code,
        public_key_hex=u.ed25519_public_key.hex() if u.ed25519_public_key else None,
        enrollment_data=u.enrollment_data,
        extra_fields=u.extra_fields,
        created_at=u.created_at,
        updated_at=u.updated_at,
    )
