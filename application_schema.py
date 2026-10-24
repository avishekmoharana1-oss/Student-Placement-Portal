from pydantic import BaseModel


class JobApplicationCreate(BaseModel):
    student_user_id: int
    job_id: int