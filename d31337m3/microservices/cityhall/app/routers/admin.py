import math

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import get_current_user, require_admin
from app.database import get_session
from app.models import User
from app.schemas import AdminUserUpdate, PaginatedUsers, UserAdmin

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
