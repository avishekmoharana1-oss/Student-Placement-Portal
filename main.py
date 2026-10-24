from datetime import date

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from pydantic import BaseModel, EmailStr

from database import get_connection
from jwt_auth import get_current_user
from security import create_access_token, hash_password, verify_password


# ============================================================
# APP CONFIGURATION
# ============================================================

app = FastAPI(
    title="Student Placement Portal API",
    description="Full Stack Python Student Placement Portal API",
    version="1.0.0"
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# PYDANTIC MODELS
# ============================================================

class StudentRegister(BaseModel):
    full_name: str
    email: EmailStr
    password: str


class StudentLogin(BaseModel):
    email: EmailStr
    password: str


class StudentProfileCreate(BaseModel):
    user_id: int
    phone: str
    education: str
    skills: str
    certifications: str
    resume_path: str


class JobCreate(BaseModel):
    posted_by_user_id: int
    job_title: str
    company_name: str
    location: str
    job_description: str
    skills_required: str
    salary: str
    application_deadline: date
    type: str = "Full-time"


class JobUpdate(BaseModel):
    user_id: int
    job_title: str
    company_name: str
    location: str
    job_description: str
    skills_required: str
    salary: str
    application_deadline: date
    type: str = "Full-time"


class JobDeactivate(BaseModel):
    user_id: int


class JobApplicationCreate(BaseModel):
    student_user_id: int
    job_id: int


class ApplicationStatusUpdate(BaseModel):
    user_id: int
    status: str


# ============================================================
# HOME
# ============================================================

@app.get("/")
def home():
    return {
        "message": "Student Placement Portal API is running"
    }


# ============================================================
# DATABASE TEST
# ============================================================

@app.get("/db-test")
def db_test(
    current_user: dict = Depends(get_current_user)
):
    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute("SELECT 1")
        result = cursor.fetchone()

        return {
            "message": "Database connection successful",
            "user_id": current_user["user_id"],
            "role": current_user["role"],
            "result": result[0]
        }

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Database connection failed"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# STUDENT REGISTRATION
# ============================================================

@app.post("/register")
def register_student(student: StudentRegister):

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT UserId
            FROM Users
            WHERE Email = ?
            """,
            student.email
        )

        existing_user = cursor.fetchone()

        if existing_user:
            raise HTTPException(
                status_code=400,
                detail="Email already registered"
            )

        password_hash = hash_password(student.password)

        cursor.execute(
            """
            INSERT INTO Users
            (
                FullName,
                Email,
                PasswordHash,
                Role
            )
            OUTPUT INSERTED.UserId
            VALUES (?, ?, ?, 'Student')
            """,
            student.full_name,
            student.email,
            password_hash
        )

        user_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "Student registered successfully",
            "user_id": user_id,
            "full_name": student.full_name,
            "email": student.email,
            "role": "Student"
        }

    except HTTPException:
        if connection:
            connection.rollback()
        raise

    except Exception:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to register student"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# LOGIN
# ============================================================

@app.post("/login")
def login(user: StudentLogin):

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                UserId,
                FullName,
                Email,
                PasswordHash,
                Role
            FROM Users
            WHERE Email = ?
            """,
            user.email
        )

        existing_user = cursor.fetchone()

        if not existing_user:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        user_id = existing_user[0]
        full_name = existing_user[1]
        email = existing_user[2]
        password_hash = existing_user[3]
        role = existing_user[4]

        try:
            password_valid = verify_password(
                user.password,
                password_hash
            )
        except Exception:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        if not password_valid:
            raise HTTPException(
                status_code=401,
                detail="Invalid email or password"
            )

        access_token = create_access_token(
            {
                "user_id": user_id,
                "email": email,
                "role": role
            }
        )

        return {
            "message": "Login successful",
            "access_token": access_token,
            "token_type": "bearer",
            "user_id": user_id,
            "full_name": full_name,
            "email": email,
            "role": role
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to login"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# CREATE / UPDATE STUDENT PROFILE
# ============================================================

@app.post("/profile")
def create_profile(
    profile: StudentProfileCreate,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "Student":
        raise HTTPException(
            status_code=403,
            detail="Only students can create profiles"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        user_id = current_user["user_id"]

        cursor.execute(
            """
            SELECT ProfileId
            FROM StudentProfiles
            WHERE UserId = ?
            """,
            user_id
        )

        existing_profile = cursor.fetchone()

        if existing_profile:
            raise HTTPException(
                status_code=400,
                detail="Student profile already exists"
            )

        cursor.execute(
            """
            INSERT INTO StudentProfiles
            (
                UserId,
                Phone,
                Education,
                Skills,
                Certifications,
                ResumePath
            )
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            user_id,
            profile.phone,
            profile.education,
            profile.skills,
            profile.certifications,
            profile.resume_path
        )

        connection.commit()

        return {
            "message": "Student profile created successfully",
            "user_id": user_id
        }

    except HTTPException:
        if connection:
            connection.rollback()
        raise

    except Exception:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to create student profile"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# GET STUDENT PROFILE
# ============================================================

@app.get("/profile/{user_id}")
def get_profile(
    user_id: int,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "Student":
        raise HTTPException(
            status_code=403,
            detail="Only students can access profiles"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        logged_in_user_id = current_user["user_id"]

        cursor.execute(
            """
            SELECT
                ProfileId,
                UserId,
                Phone,
                Education,
                Skills,
                Certifications,
                ResumePath
            FROM StudentProfiles
            WHERE UserId = ?
            """,
            logged_in_user_id
        )

        profile = cursor.fetchone()

        if not profile:
            raise HTTPException(
                status_code=404,
                detail="Student profile not found"
            )

        return {
            "profile_id": profile[0],
            "user_id": profile[1],
            "phone": profile[2],
            "education": profile[3],
            "skills": profile[4],
            "certifications": profile[5],
            "resume_path": profile[6]
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to get student profile"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# GET ACTIVE JOBS
# ============================================================

@app.get("/jobs")
def get_jobs():

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                JobId,
                PostedByUserId,
                JobTitle,
                CompanyName,
                Location,
                JobDescription,
                SkillsRequired,
                Salary,
                ApplicationDeadline,
                PostedDate,
                IsActive
            FROM Jobs
            WHERE IsActive = 1
            ORDER BY PostedDate DESC
            """
        )

        jobs = cursor.fetchall()

        result = []

        for job in jobs:
            result.append(
                {
                    "job_id": job[0],
                    "posted_by_user_id": job[1],
                    "job_title": job[2],
                    "company_name": job[3],
                    "location": job[4],
                    "job_description": job[5],
                    "skills_required": job[6],
                    "salary": job[7],
                    "application_deadline": job[8],
                    "posted_date": job[9],
                    "is_active": job[10]
                }
            )

        return result

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch jobs"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# SEARCH JOBS
# ============================================================

@app.get("/jobs/search")
def search_jobs(
    keyword: str = "",
    location: str = ""
):

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        keyword_value = f"%{keyword}%"
        location_value = f"%{location}%"

        cursor.execute(
            """
            SELECT
                JobId,
                PostedByUserId,
                JobTitle,
                CompanyName,
                Location,
                JobDescription,
                SkillsRequired,
                Salary,
                ApplicationDeadline,
                PostedDate,
                IsActive
            FROM Jobs
            WHERE IsActive = 1
            AND
            (
                JobTitle LIKE ?
                OR CompanyName LIKE ?
                OR SkillsRequired LIKE ?
                OR JobDescription LIKE ?
            )
            AND Location LIKE ?
            ORDER BY PostedDate DESC
            """,
            keyword_value,
            keyword_value,
            keyword_value,
            keyword_value,
            location_value
        )

        jobs = cursor.fetchall()

        result = []

        for job in jobs:
            result.append(
                {
                    "job_id": job[0],
                    "posted_by_user_id": job[1],
                    "job_title": job[2],
                    "company_name": job[3],
                    "location": job[4],
                    "job_description": job[5],
                    "skills_required": job[6],
                    "salary": job[7],
                    "application_deadline": job[8],
                    "posted_date": job[9],
                    "is_active": job[10]
                }
            )

        return result

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to search jobs"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# GET JOB DETAILS
# ============================================================

@app.get("/jobs/{job_id}")
def get_job(job_id: int):

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                JobId,
                PostedByUserId,
                JobTitle,
                CompanyName,
                Location,
                JobDescription,
                SkillsRequired,
                Salary,
                ApplicationDeadline,
                PostedDate,
                IsActive
            FROM Jobs
            WHERE JobId = ?
            """,
            job_id
        )

        job = cursor.fetchone()

        if not job:
            raise HTTPException(
                status_code=404,
                detail="Job not found"
            )

        return {
            "job_id": job[0],
            "posted_by_user_id": job[1],
            "job_title": job[2],
            "company_name": job[3],
            "location": job[4],
            "job_description": job[5],
            "skills_required": job[6],
            "salary": job[7],
            "application_deadline": job[8],
            "posted_date": job[9],
            "is_active": job[10]
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to get job details"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# GET ALL JOBS FOR RECRUITER / ADMIN
# INCLUDING ACTIVE AND INACTIVE JOBS
# ============================================================

@app.get("/recruiter/jobs")
def get_recruiter_jobs(
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] not in ["Recruiter", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only recruiters and admins can access job management"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                JobId,
                PostedByUserId,
                JobTitle,
                CompanyName,
                Location,
                JobDescription,
                SkillsRequired,
                Salary,
                ApplicationDeadline,
                PostedDate,
                IsActive
            FROM Jobs
            ORDER BY PostedDate DESC
            """
        )

        jobs = cursor.fetchall()

        result = []

        for job in jobs:
            result.append(
                {
                    "job_id": job[0],
                    "posted_by_user_id": job[1],
                    "job_title": job[2],
                    "company_name": job[3],
                    "location": job[4],
                    "job_description": job[5],
                    "skills_required": job[6],
                    "salary": job[7],
                    "application_deadline": job[8],
                    "posted_date": job[9],
                    "is_active": job[10]
                }
            )

        return result

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch recruiter jobs"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# CREATE JOB
# ============================================================

@app.post("/jobs")
def create_job(
    job: JobCreate,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] not in ["Recruiter", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only recruiters and admins can create jobs"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        recruiter_id = current_user["user_id"]

        cursor.execute(
            """
            INSERT INTO Jobs
            (
                PostedByUserId,
                JobTitle,
                CompanyName,
                Location,
                JobDescription,
                SkillsRequired,
                Salary,
                ApplicationDeadline,
                IsActive
            )
            OUTPUT INSERTED.JobId
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            recruiter_id,
            job.job_title,
            job.company_name,
            job.location,
            job.job_description,
            job.skills_required,
            job.salary,
            job.application_deadline
        )

        job_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "Job created successfully",
            "job_id": job_id
        }

    except HTTPException:
        if connection:
            connection.rollback()
        raise

    except Exception:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to create job"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# UPDATE JOB
# ============================================================

@app.put("/jobs/{job_id}")
def update_job(
    job_id: int,
    job: JobUpdate,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] not in ["Recruiter", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only recruiters and admins can update jobs"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT JobId
            FROM Jobs
            WHERE JobId = ?
            """,
            job_id
        )

        existing_job = cursor.fetchone()

        if not existing_job:
            raise HTTPException(
                status_code=404,
                detail="Job not found"
            )

        cursor.execute(
            """
            UPDATE Jobs
            SET
                JobTitle = ?,
                CompanyName = ?,
                Location = ?,
                JobDescription = ?,
                SkillsRequired = ?,
                Salary = ?,
                ApplicationDeadline = ?
            WHERE JobId = ?
            """,
            job.job_title,
            job.company_name,
            job.location,
            job.job_description,
            job.skills_required,
            job.salary,
            job.application_deadline,
            job_id
        )

        connection.commit()

        return {
            "message": "Job updated successfully",
            "job_id": job_id
        }

    except HTTPException:
        if connection:
            connection.rollback()
        raise

    except Exception:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to update job"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# DEACTIVATE JOB
# ============================================================

@app.delete("/jobs/{job_id}")
def deactivate_job(
    job_id: int,
    job: JobDeactivate,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] not in ["Recruiter", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only recruiters and admins can deactivate jobs"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT JobId
            FROM Jobs
            WHERE JobId = ?
            AND IsActive = 1
            """,
            job_id
        )

        existing_job = cursor.fetchone()

        if not existing_job:
            raise HTTPException(
                status_code=404,
                detail="Active job not found"
            )

        cursor.execute(
            """
            UPDATE Jobs
            SET IsActive = 0
            WHERE JobId = ?
            """,
            job_id
        )

        connection.commit()

        return {
            "message": "Job deactivated successfully",
            "job_id": job_id
        }

    except HTTPException:
        if connection:
            connection.rollback()
        raise

    except Exception:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to deactivate job"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# REACTIVATE JOB
# ============================================================

@app.put("/jobs/{job_id}/reactivate")
def reactivate_job(
    job_id: int,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] not in ["Recruiter", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only recruiters and admins can reactivate jobs"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT JobId
            FROM Jobs
            WHERE JobId = ?
            AND IsActive = 0
            """,
            job_id
        )

        existing_job = cursor.fetchone()

        if not existing_job:
            raise HTTPException(
                status_code=404,
                detail="Inactive job not found"
            )

        cursor.execute(
            """
            UPDATE Jobs
            SET IsActive = 1
            WHERE JobId = ?
            """,
            job_id
        )

        connection.commit()

        return {
            "message": "Job reactivated successfully",
            "job_id": job_id
        }

    except HTTPException:
        if connection:
            connection.rollback()
        raise

    except Exception:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to reactivate job"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# APPLY FOR JOB
# ============================================================

@app.post("/applications")
def apply_for_job(
    application: JobApplicationCreate,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "Student":
        raise HTTPException(
            status_code=403,
            detail="Only students can apply for jobs"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        student_id = current_user["user_id"]

        cursor.execute(
            """
            SELECT JobId
            FROM Jobs
            WHERE JobId = ?
            AND IsActive = 1
            """,
            application.job_id
        )

        job = cursor.fetchone()

        if not job:
            raise HTTPException(
                status_code=404,
                detail="Active job not found"
            )

        cursor.execute(
            """
            SELECT ApplicationId
            FROM Applications
            WHERE StudentUserId = ?
            AND JobId = ?
            """,
            student_id,
            application.job_id
        )

        existing_application = cursor.fetchone()

        if existing_application:
            raise HTTPException(
                status_code=400,
                detail="You have already applied for this job"
            )

        cursor.execute(
            """
            INSERT INTO Applications
            (
                StudentUserId,
                JobId,
                Status
            )
            OUTPUT INSERTED.ApplicationId
            VALUES (?, ?, 'Applied')
            """,
            student_id,
            application.job_id
        )

        application_id = cursor.fetchone()[0]

        connection.commit()

        return {
            "message": "Job application submitted successfully",
            "application_id": application_id,
            "student_user_id": student_id,
            "job_id": application.job_id,
            "status": "Applied"
        }

    except HTTPException:
        if connection:
            connection.rollback()
        raise

    except Exception:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to submit job application"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# GET STUDENT APPLICATIONS
# ============================================================

@app.get("/applications/{student_user_id}")
def get_student_applications(
    student_user_id: int,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "Student":
        raise HTTPException(
            status_code=403,
            detail="Only students can access student applications"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        logged_in_student_id = current_user["user_id"]

        cursor.execute(
            """
            SELECT
                A.ApplicationId,
                A.StudentUserId,
                A.JobId,
                A.AppliedDate,
                A.Status,
                J.JobTitle,
                J.CompanyName,
                J.Location,
                J.Salary
            FROM Applications A
            INNER JOIN Jobs J
                ON A.JobId = J.JobId
            WHERE A.StudentUserId = ?
            ORDER BY A.AppliedDate DESC
            """,
            logged_in_student_id
        )

        applications = cursor.fetchall()

        result = []

        for application in applications:
            result.append(
                {
                    "application_id": application[0],
                    "student_user_id": application[1],
                    "job_id": application[2],
                    "applied_date": application[3],
                    "status": application[4],
                    "job_title": application[5],
                    "company_name": application[6],
                    "location": application[7],
                    "salary": application[8]
                }
            )

        return result

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch student applications"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# GET SINGLE APPLICATION
# ============================================================

@app.get("/applications/{student_user_id}/{application_id}")
def get_single_application(
    student_user_id: int,
    application_id: int,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] != "Student":
        raise HTTPException(
            status_code=403,
            detail="Only students can access applications"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        logged_in_student_id = current_user["user_id"]

        cursor.execute(
            """
            SELECT
                A.ApplicationId,
                A.StudentUserId,
                A.JobId,
                A.AppliedDate,
                A.Status,
                J.JobTitle,
                J.CompanyName,
                J.Location,
                J.Salary
            FROM Applications A
            INNER JOIN Jobs J
                ON A.JobId = J.JobId
            WHERE A.ApplicationId = ?
            AND A.StudentUserId = ?
            """,
            application_id,
            logged_in_student_id
        )

        application = cursor.fetchone()

        if not application:
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )

        return {
            "application_id": application[0],
            "student_user_id": application[1],
            "job_id": application[2],
            "applied_date": application[3],
            "status": application[4],
            "job_title": application[5],
            "company_name": application[6],
            "location": application[7],
            "salary": application[8]
        }

    except HTTPException:
        raise

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch application"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# GET ALL APPLICATIONS FOR RECRUITER / ADMIN
# ============================================================

@app.get("/recruiter/applications")
def get_recruiter_applications(
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] not in ["Recruiter", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only recruiters and admins can access applications"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT
                A.ApplicationId,
                A.StudentUserId,
                U.FullName,
                U.Email,
                A.JobId,
                J.JobTitle,
                J.CompanyName,
                A.AppliedDate,
                A.Status
            FROM Applications A
            INNER JOIN Users U
                ON A.StudentUserId = U.UserId
            INNER JOIN Jobs J
                ON A.JobId = J.JobId
            ORDER BY A.AppliedDate DESC
            """
        )

        applications = cursor.fetchall()

        result = []

        for application in applications:
            result.append(
                {
                    "application_id": application[0],
                    "student_user_id": application[1],
                    "student_name": application[2],
                    "student_email": application[3],
                    "job_id": application[4],
                    "job_title": application[5],
                    "company_name": application[6],
                    "applied_date": application[7],
                    "status": application[8]
                }
            )

        return result

    except Exception:
        raise HTTPException(
            status_code=500,
            detail="Unable to fetch recruiter applications"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# UPDATE APPLICATION STATUS
# ============================================================

@app.put("/recruiter/applications/{application_id}/status")
def update_application_status(
    application_id: int,
    status_update: ApplicationStatusUpdate,
    current_user: dict = Depends(get_current_user)
):

    if current_user["role"] not in ["Recruiter", "Admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only recruiters and admins can update application status"
        )

    allowed_statuses = [
        "Applied",
        "Shortlisted",
        "Rejected",
        "Selected"
    ]

    if status_update.status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid application status"
        )

    connection = None
    cursor = None

    try:
        connection = get_connection()
        cursor = connection.cursor()

        cursor.execute(
            """
            SELECT ApplicationId
            FROM Applications
            WHERE ApplicationId = ?
            """,
            application_id
        )

        existing_application = cursor.fetchone()

        if not existing_application:
            raise HTTPException(
                status_code=404,
                detail="Application not found"
            )

        cursor.execute(
            """
            UPDATE Applications
            SET Status = ?
            WHERE ApplicationId = ?
            """,
            status_update.status,
            application_id
        )

        connection.commit()

        return {
            "message": "Application status updated successfully",
            "application_id": application_id,
            "status": status_update.status
        }

    except HTTPException:
        if connection:
            connection.rollback()
        raise

    except Exception:
        if connection:
            connection.rollback()

        raise HTTPException(
            status_code=500,
            detail="Unable to update application status"
        )

    finally:
        if cursor:
            cursor.close()

        if connection:
            connection.close()


# ============================================================
# GLOBAL ERROR HANDLER
# ============================================================

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):

    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error"
        }
    )