from pydantic import BaseModel, EmailStr


class StudentRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class StudentLogin(BaseModel):
    email: EmailStr
    password: str