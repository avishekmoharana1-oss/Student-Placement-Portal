from fastapi import HTTPException
from database import get_connection


def get_user_role(user_id: int):
    connection = get_connection()
    cursor = connection.cursor()

    cursor.execute(
        """
        SELECT UserId, FullName, Email, Role
        FROM Users
        WHERE UserId = ?
        """,
        user_id
    )

    user = cursor.fetchone()

    cursor.close()
    connection.close()

    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found"
        )

    return {
        "user_id": user[0],
        "full_name": user[1],
        "email": user[2],
        "role": user[3]
    }


def require_role(user_id: int, allowed_roles: list):
    user = get_user_role(user_id)

    if user["role"] not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to perform this action"
        )

    return user