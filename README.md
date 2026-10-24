# Student Placement Portal

A web-based Student Placement Portal developed to help students explore job opportunities and manage their placement applications, while allowing recruiters and administrators to manage job postings and application statuses.

## Features

### Student
- Student registration and login
- Student profile management
- Browse available job opportunities
- Apply for jobs
- Track application status

### Recruiter and Admin
- Create and manage job postings
- Update job details
- Deactivate job postings
- Manage job applications and their statuses
- Role-based access control

### Security
- JWT-based authentication
- Password hashing
- Role-based authorization

## Technology Stack

- **Backend:** Python, FastAPI
- **Database:** Microsoft SQL Server
- **Database Connectivity:** pyodbc
- **Frontend:** HTML, CSS, JavaScript, Bootstrap
- **API Documentation:** Swagger UI
- **Authentication:** JWT

## Prerequisites

Install the following before running the project:

- Python
- Microsoft SQL Server and SQL Server Management Studio (SSMS)
- Microsoft ODBC Driver 17 for SQL Server
- Visual Studio Code (recommended)

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/avishekmoharana1-oss/Student-Placement-Portal.git
cd Student-Placement-Portal
```

### 2. Create a Virtual Environment

```bash
python -m venv venv
```

Activate it on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies

```bash
python -m pip install -r requirements.txt
```

### 4. Configure the Database

Configure SQL Server and create the database required by the application.

The current database connection settings in `database.py` use:

- **Server:** `.\SQLEXPRESS`
- **Database:** `StudentPlacementDB`
- **Authentication:** Windows Authentication

Make sure your SQL Server instance and database match these settings. Set up the database tables using the SQL scripts or schema used by the project.

### 5. Configure the JWT Secret

Set a secret key in your PowerShell terminal before starting the application:

```powershell
$env:JWT_SECRET_KEY = python -c "import secrets; print(secrets.token_hex(32))"
```

Keep the same secret key while using the application. If you restart the terminal, set it again. Changing the key invalidates existing JWT tokens.

### 6. Run the Application

Start the FastAPI development server:

```bash
python -m uvicorn main:app --reload
```

The application will be available at:

- **API base URL:** http://127.0.0.1:8000
- **Swagger API documentation:** http://127.0.0.1:8000/docs

## API Testing

Open Swagger UI at `http://127.0.0.1:8000/docs` to explore and test the available API endpoints.

Available API areas include authentication, student profiles, job postings, and job applications. The exact endpoints and permissions are defined in the application.

## Security Notes

- Never commit passwords, private keys, tokens, or `.env` files.
- Keep secret keys private.
- Use the `.gitignore` file to exclude virtual environments and sensitive local configuration.

## Future Improvements

- Improve the user interface and dashboard.
- Add more placement analytics and reporting.
- Expand search and filtering capabilities.
- Improve deployment and production configuration.

## Author

Developed as a Student Placement Portal project using Python, FastAPI, and Microsoft SQL Server.

## License

No license has been specified yet.
