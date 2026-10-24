from pydantic import BaseModel


class StudentProfileCreate(BaseModel):
    user_id: int
    phone: str
    education: str
    skills: str
    certifications: str
    resume_path: str