from pydantic import BaseModel
from datetime import date


class JobCreate(BaseModel):
    posted_by_user_id: int
    job_title: str
    company_name: str
    location: str
    job_description: str
    skills_required: str
    salary: str
    application_deadline: date