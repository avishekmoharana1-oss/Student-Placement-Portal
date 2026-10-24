// =========================================================
// STUDENT PLACEMENT PORTAL - FRONTEND JAVASCRIPT
// =========================================================

const API_BASE_URL = "http://127.0.0.1:8000";


// =========================================================
// GLOBAL STATE
// =========================================================

let currentUser = null;
let currentJobs = [];


// =========================================================
// PAGE INITIALIZATION
// =========================================================

document.addEventListener("DOMContentLoaded", () => {

    loadSavedUser();

    updateNavbar();

    showSection("home");

    loadJobs();

    setupForms();
});


// =========================================================
// LOCAL STORAGE / LOGIN STATE
// =========================================================

function loadSavedUser() {

    const token = localStorage.getItem("access_token");
    const userData = localStorage.getItem("current_user");

    if (token && userData) {

        try {
            currentUser = JSON.parse(userData);
        } catch (error) {
            currentUser = null;
            localStorage.removeItem("access_token");
            localStorage.removeItem("current_user");
        }
    }
}


function saveLoginData(data) {

    localStorage.setItem("access_token", data.access_token);

    currentUser = {
        user_id: data.user_id,
        full_name: data.full_name,
        email: data.email,
        role: data.role
    };

    localStorage.setItem(
        "current_user",
        JSON.stringify(currentUser)
    );

    updateNavbar();
}


function logout() {

    localStorage.removeItem("access_token");
    localStorage.removeItem("current_user");

    currentUser = null;

    updateNavbar();

    showAlert(
        "You have been logged out successfully.",
        "success"
    );

    showSection("home");
}


// =========================================================
// AUTHORIZATION HEADER
// =========================================================

function getAuthHeaders() {

    const token = localStorage.getItem("access_token");

    if (!token) {
        return {};
    }

    return {
        "Authorization": `Bearer ${token}`
    };
}


function getJsonAuthHeaders() {

    return {
        "Content-Type": "application/json",
        ...getAuthHeaders()
    };
}


// =========================================================
// NAVBAR
// =========================================================

function updateNavbar() {

    const navLogin = document.getElementById("navLogin");
    const navRegister = document.getElementById("navRegister");
    const navLogout = document.getElementById("navLogout");

    const navProfile = document.getElementById("navProfile");
    const navApplications = document.getElementById("navApplications");
    const navDashboard = document.getElementById("navDashboard");

    if (!currentUser) {

        navLogin.style.display = "block";
        navRegister.style.display = "block";
        navLogout.style.display = "none";

        navProfile.style.display = "none";
        navApplications.style.display = "none";
        navDashboard.style.display = "none";

        return;
    }


    navLogin.style.display = "none";
    navRegister.style.display = "none";
    navLogout.style.display = "block";


    if (currentUser.role === "Student") {

        navProfile.style.display = "block";
        navApplications.style.display = "block";
        navDashboard.style.display = "block";

    } else if (
        currentUser.role === "Recruiter" ||
        currentUser.role === "Admin"
    ) {

        navProfile.style.display = "none";
        navApplications.style.display = "none";
        navDashboard.style.display = "block";
    }
}


// =========================================================
// SECTION NAVIGATION
// =========================================================

function showSection(sectionId) {

    const sections = document.querySelectorAll(".page-section");

    sections.forEach(section => {
        section.classList.add("d-none");
    });


    const selectedSection = document.getElementById(sectionId);

    if (!selectedSection) {
        return;
    }

    selectedSection.classList.remove("d-none");

    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    // Load data depending on section

    if (sectionId === "jobs") {
        loadJobs();
    }

    if (sectionId === "profile") {

        if (!requireLogin()) {
            return;
        }

        loadProfile();
    }

    if (sectionId === "applications") {

        if (!requireLogin()) {
            return;
        }

        loadApplications();
    }

    if (sectionId === "studentDashboard") {

        if (!requireStudent()) {
            return;
        }

        loadStudentDashboard();
    }

    if (sectionId === "recruiterDashboard") {

        if (!requireRecruiter()) {
            return;
        }

        loadRecruiterDashboard();
    }
}


// =========================================================
// DASHBOARD ROUTING
// =========================================================

function showDashboard() {

    if (!currentUser) {

        showSection("login");

        return;
    }


    if (currentUser.role === "Student") {

        showSection("studentDashboard");

    } else if (
        currentUser.role === "Recruiter" ||
        currentUser.role === "Admin"
    ) {

        showSection("recruiterDashboard");

    } else {

        showAlert(
            "Unknown user role.",
            "danger"
        );
    }
}


// =========================================================
// LOGIN CHECKS
// =========================================================

function requireLogin() {

    if (!currentUser) {

        showAlert(
            "Please login first.",
            "warning"
        );

        showSection("login");

        return false;
    }

    return true;
}


function requireStudent() {

    if (!requireLogin()) {
        return false;
    }

    if (currentUser.role !== "Student") {

        showAlert(
            "Only students can access this section.",
            "danger"
        );

        return false;
    }

    return true;
}


function requireRecruiter() {

    if (!requireLogin()) {
        return false;
    }

    if (
        currentUser.role !== "Recruiter" &&
        currentUser.role !== "Admin"
    ) {

        showAlert(
            "Only recruiters and admins can access this section.",
            "danger"
        );

        return false;
    }

    return true;
}


// =========================================================
// ALERT
// =========================================================

function showAlert(message, type = "info") {

    const alertBox = document.getElementById("alertBox");

    if (!alertBox) {
        return;
    }


    alertBox.innerHTML = `
        <div class="alert alert-${type} custom-alert alert-dismissible fade show" role="alert">
            ${escapeHtml(message)}

            <button
                type="button"
                class="btn-close"
                data-bs-dismiss="alert">
            </button>
        </div>
    `;


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });


    setTimeout(() => {

        const alert = alertBox.querySelector(".alert");

        if (alert) {

            try {
                bootstrap.Alert.getOrCreateInstance(alert).close();
            } catch (error) {
                alert.remove();
            }
        }

    }, 5000);
}


// =========================================================
// API ERROR HANDLER
// =========================================================

async function getErrorMessage(response) {

    try {

        const data = await response.json();

        if (data.detail) {

            if (typeof data.detail === "string") {
                return data.detail;
            }

            return JSON.stringify(data.detail);
        }

        return `Request failed with status ${response.status}.`;

    } catch (error) {

        return `Request failed with status ${response.status}.`;
    }
}


// =========================================================
// SETUP FORMS
// =========================================================

function setupForms() {

    const loginForm = document.getElementById("loginForm");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            handleLogin
        );
    }


    const registerForm = document.getElementById("registerForm");

    if (registerForm) {

        registerForm.addEventListener(
            "submit",
            handleRegister
        );
    }


    const profileForm = document.getElementById("profileForm");

    if (profileForm) {

        profileForm.addEventListener(
            "submit",
            handleProfileSubmit
        );
    }


    const createJobForm = document.getElementById("createJobForm");

    if (createJobForm) {

        createJobForm.addEventListener(
            "submit",
            handleCreateJob
        );
    }
}


// =========================================================
// REGISTER
// =========================================================

async function handleRegister(event) {

    event.preventDefault();


    const fullName =
        document.getElementById("registerName").value.trim();

    const email =
        document.getElementById("registerEmail").value.trim();

    const password =
        document.getElementById("registerPassword").value;


    if (!fullName || !email || !password) {

        showAlert(
            "Please fill all registration fields.",
            "warning"
        );

        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/register`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    full_name: fullName,
                    email: email,
                    password: password
                })
            }
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            showAlert(message, "danger");

            return;
        }


        const data = await response.json();


        showAlert(
            data.message ||
            "Registration successful. Please login.",
            "success"
        );


        document.getElementById("registerForm").reset();

        showSection("login");

    } catch (error) {

        showAlert(
            "Unable to connect to the backend. Make sure FastAPI is running.",
            "danger"
        );
    }
}


// =========================================================
// LOGIN
// =========================================================

async function handleLogin(event) {

    event.preventDefault();


    const email =
        document.getElementById("loginEmail").value.trim();

    const password =
        document.getElementById("loginPassword").value;


    if (!email || !password) {

        showAlert(
            "Please enter email and password.",
            "warning"
        );

        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/login`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            showAlert(message, "danger");

            return;
        }


        const data = await response.json();


        saveLoginData(data);


        document.getElementById("loginForm").reset();


        showAlert(
            `Welcome ${data.full_name}!`,
            "success"
        );


        showDashboard();

    } catch (error) {

        showAlert(
            "Unable to connect to the backend. Make sure FastAPI is running.",
            "danger"
        );
    }
}


// =========================================================
// LOAD JOBS
// =========================================================

async function loadJobs() {

    const container =
        document.getElementById("jobsContainer");


    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="col-12 loading-container">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3 text-muted">
                Loading jobs...
            </p>
        </div>
    `;


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/recruiter/jobs`,
                {
                    headers: getAuthHeaders()
                }
            );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        ${escapeHtml(message)}
                    </div>
                </div>
            `;

            return;
        }


        const jobs = await response.json();

        currentJobs = jobs;

        renderJobs(jobs);


    } catch (error) {

        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Unable to connect to the FastAPI backend.
                </div>
            </div>
        `;
    }
}


// =========================================================
// RENDER JOBS
// =========================================================

function renderJobs(jobs) {

    const container =
        document.getElementById("jobsContainer");


    if (!jobs || jobs.length === 0) {

        container.innerHTML = `
            <div class="col-12">
                <div class="text-center py-5">
                    <i class="bi bi-briefcase display-4 text-muted"></i>
                    <h4 class="mt-3">
                        No jobs found
                    </h4>
                    <p class="text-muted">
                        Try another search.
                    </p>
                </div>
            </div>
        `;

        return;
    }


    container.innerHTML = jobs.map(job => {

        const skills = job.skills_required
            ? job.skills_required
                .split(",")
                .map(skill => `
                    <span class="skill-badge">
                        ${escapeHtml(skill.trim())}
                    </span>
                `)
                .join("")
            : "";


        return `
            <div class="col-md-6 col-lg-4">

                <div class="job-card">

                    <div class="job-card-header">

                        <div class="job-title">
                            ${escapeHtml(job.job_title)}
                        </div>

                        <div class="mt-2">
                            <i class="bi bi-building"></i>
                            ${escapeHtml(job.company_name)}
                        </div>

                    </div>


                    <div class="job-card-body">

                        <div class="job-info">
                            <i class="bi bi-geo-alt-fill"></i>
                            ${escapeHtml(job.location || "Not specified")}
                        </div>

                        <div class="job-info">
                            <i class="bi bi-cash-stack"></i>
                            ${escapeHtml(job.salary || "Not specified")}
                        </div>

                        <div class="job-info">
                            <i class="bi bi-calendar-event"></i>
                            Deadline:
                            ${formatDate(job.application_deadline)}
                        </div>


                        <div class="mt-3">
                            ${skills}
                        </div>


                        <div class="d-grid mt-4">

                            <button
                                class="btn btn-primary"
                                onclick="viewJobDetails(${job.job_id})"
                            >
                                <i class="bi bi-eye"></i>
                                View Details
                            </button>

                        </div>

                    </div>

                </div>

            </div>
        `;

    }).join("");
}


// =========================================================
// SEARCH JOBS
// =========================================================

async function searchJobs() {

    const keyword =
        document.getElementById("jobKeyword").value.trim();

    const location =
        document.getElementById("jobLocation").value.trim();


    let url =
        `${API_BASE_URL}/jobs/search`;


    const params = new URLSearchParams();


    if (keyword) {
        params.append("keyword", keyword);
    }


    if (location) {
        params.append("location", location);
    }


    const queryString = params.toString();


    if (queryString) {
        url += `?${queryString}`;
    }


    const container =
        document.getElementById("jobsContainer");


    container.innerHTML = `
        <div class="col-12 loading-container">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3 text-muted">
                Searching jobs...
            </p>
        </div>
    `;


    try {

        const response = await fetch(url);


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            container.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger">
                        ${escapeHtml(message)}
                    </div>
                </div>
            `;

            return;
        }


        const jobs = await response.json();

        currentJobs = jobs;

        renderJobs(jobs);

    } catch (error) {

        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    Unable to connect to the backend.
                </div>
            </div>
        `;
    }
}


// =========================================================
// JOB DETAILS
// =========================================================

async function viewJobDetails(jobId) {

    showSection("jobDetails");


    const container =
        document.getElementById("jobDetailsContainer");


    container.innerHTML = `
        <div class="loading-container">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3 text-muted">
                Loading job details...
            </p>
        </div>
    `;


    try {

        const response = await fetch(
            `${API_BASE_URL}/jobs/${jobId}`
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHtml(message)}
                </div>
            `;

            return;
        }


        const job = await response.json();


        const skills = job.skills_required
            ? job.skills_required
                .split(",")
                .map(skill => `
                    <span class="skill-badge">
                        ${escapeHtml(skill.trim())}
                    </span>
                `)
                .join("")
            : "Not specified";


        let applyButton = "";


        if (!currentUser) {

            applyButton = `
                <button
                    class="btn btn-primary"
                    onclick="showSection('login')"
                >
                    <i class="bi bi-box-arrow-in-right"></i>
                    Login to Apply
                </button>
            `;

        } else if (currentUser.role === "Student") {

            applyButton = `
                <button
                    class="btn btn-success"
                    onclick="applyForJob(${job.job_id})"
                >
                    <i class="bi bi-send"></i>
                    Apply Now
                </button>
            `;

        } else {

            applyButton = `
                <div class="alert alert-info mb-0">
                    Only students can apply for jobs.
                </div>
            `;
        }


        container.innerHTML = `

            <div class="card job-details-card">

                <div class="job-details-header">

                    <h1 class="fw-bold">
                        ${escapeHtml(job.job_title)}
                    </h1>

                    <h5 class="mt-3">
                        <i class="bi bi-building"></i>
                        ${escapeHtml(job.company_name)}
                    </h5>

                </div>


                <div class="job-details-body">

                    <div class="row g-4">

                        <div class="col-md-6">

                            <div class="job-details-label">
                                <i class="bi bi-geo-alt"></i>
                                Location
                            </div>

                            <div class="job-details-value">
                                ${escapeHtml(job.location || "Not specified")}
                            </div>

                        </div>


                        <div class="col-md-6">

                            <div class="job-details-label">
                                <i class="bi bi-cash-stack"></i>
                                Salary
                            </div>

                            <div class="job-details-value">
                                ${escapeHtml(job.salary || "Not specified")}
                            </div>

                        </div>


                        <div class="col-md-6">

                            <div class="job-details-label">
                                <i class="bi bi-calendar-event"></i>
                                Application Deadline
                            </div>

                            <div class="job-details-value">
                                ${formatDate(job.application_deadline)}
                            </div>

                        </div>


                        <div class="col-md-6">

                            <div class="job-details-label">
                                <i class="bi bi-calendar-check"></i>
                                Posted Date
                            </div>

                            <div class="job-details-value">
                                ${formatDate(job.posted_date)}
                            </div>

                        </div>


                        <div class="col-12">

                            <div class="job-details-label">
                                Required Skills
                            </div>

                            <div class="mt-2">
                                ${skills}
                            </div>

                        </div>


                        <div class="col-12">

                            <div class="job-details-label">
                                Job Description
                            </div>

                            <div class="job-details-value mt-2">
                                ${escapeHtml(
            job.job_description ||
            "No description available."
        )}
                            </div>

                        </div>

                    </div>


                    <hr class="my-4">


                    <div>
                        ${applyButton}
                    </div>

                </div>

            </div>
        `;

    } catch (error) {

        container.innerHTML = `
            <div class="alert alert-danger">
                Unable to connect to the backend.
            </div>
        `;
    }
}


// =========================================================
// APPLY FOR JOB
// =========================================================

async function applyForJob(jobId) {

    if (!requireStudent()) {
        return;
    }


    const confirmed =
        confirm("Are you sure you want to apply for this job?");


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/applications`,
            {
                method: "POST",

                headers: getJsonAuthHeaders(),

                body: JSON.stringify({
                    student_user_id: currentUser.user_id,
                    job_id: jobId
                })
            }
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            showAlert(message, "danger");

            return;
        }


        const data = await response.json();


        showAlert(
            data.message ||
            "Application submitted successfully.",
            "success"
        );


    } catch (error) {

        showAlert(
            "Unable to connect to the backend.",
            "danger"
        );
    }
}


// =========================================================
// LOAD PROFILE
// =========================================================

async function loadProfile() {

    if (!requireStudent()) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/profile/${currentUser.user_id}`,
            {
                headers: getAuthHeaders()
            }
        );


        if (response.status === 404) {

            document.getElementById("profileForm").reset();

            return;
        }


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            showAlert(message, "danger");

            return;
        }


        const profile = await response.json();


        document.getElementById("profilePhone").value =
            profile.phone || "";

        document.getElementById("profileEducation").value =
            profile.education || "";

        document.getElementById("profileSkills").value =
            profile.skills || "";

        document.getElementById("profileCertifications").value =
            profile.certifications || "";

        document.getElementById("profileResume").value =
            profile.resume_path || "";


    } catch (error) {

        showAlert(
            "Unable to load profile.",
            "danger"
        );
    }
}


// =========================================================
// SAVE PROFILE
// =========================================================

async function handleProfileSubmit(event) {

    event.preventDefault();


    if (!requireStudent()) {
        return;
    }


    const profileData = {

        user_id: currentUser.user_id,

        phone:
            document.getElementById("profilePhone").value.trim(),

        education:
            document.getElementById("profileEducation").value.trim(),

        skills:
            document.getElementById("profileSkills").value.trim(),

        certifications:
            document.getElementById("profileCertifications").value.trim(),

        resume_path:
            document.getElementById("profileResume").value.trim()
    };


    try {

        const response = await fetch(
            `${API_BASE_URL}/profile`,
            {
                method: "POST",

                headers: getJsonAuthHeaders(),

                body: JSON.stringify(profileData)
            }
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            showAlert(message, "danger");

            return;
        }


        const data = await response.json();


        showAlert(
            data.message ||
            "Profile saved successfully.",
            "success"
        );


    } catch (error) {

        showAlert(
            "Unable to save profile.",
            "danger"
        );
    }
}


// =========================================================
// LOAD STUDENT APPLICATIONS
// =========================================================

async function loadApplications() {

    if (!requireStudent()) {
        return;
    }


    const container =
        document.getElementById("applicationsContainer");


    container.innerHTML = `
        <div class="loading-container">
            <div class="spinner-border text-primary"></div>
            <p class="mt-3 text-muted">
                Loading applications...
            </p>
        </div>
    `;


    try {

        const response = await fetch(
            `${API_BASE_URL}/applications/${currentUser.user_id}`,
            {
                headers: getAuthHeaders()
            }
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHtml(message)}
                </div>
            `;

            return;
        }


        const applications = await response.json();


        renderApplications(applications);


    } catch (error) {

        container.innerHTML = `
            <div class="alert alert-danger">
                Unable to connect to the backend.
            </div>
        `;
    }
}


// =========================================================
// RENDER STUDENT APPLICATIONS
// =========================================================

function renderApplications(applications) {

    const container =
        document.getElementById("applicationsContainer");


    if (!applications || applications.length === 0) {

        container.innerHTML = `
            <div class="text-center py-5">

                <i class="bi bi-file-earmark-x display-4 text-muted"></i>

                <h4 class="mt-3">
                    No applications yet
                </h4>

                <p class="text-muted">
                    Apply for a job to see your application here.
                </p>

                <button
                    class="btn btn-primary"
                    onclick="showSection('jobs')"
                >
                    Explore Jobs
                </button>

            </div>
        `;

        return;
    }


    container.innerHTML = applications.map(application => {

        const statusClass =
            getStatusClass(application.status);


        return `

            <div class="application-card">

                <div class="row align-items-center">

                    <div class="col-md-8">

                        <h5>
                            ${escapeHtml(
            application.job_title ||
            "Job Application"
        )}
                        </h5>

                        <div class="company mb-2">
                            ${escapeHtml(
            application.company_name ||
            "Company"
        )}
                        </div>

                        <p class="text-muted mb-1">
                            <i class="bi bi-geo-alt"></i>
                            ${escapeHtml(
            application.location ||
            "Not specified"
        )}
                        </p>

                        <p class="text-muted mb-0">
                            <i class="bi bi-calendar"></i>
                            Applied:
                            ${formatDate(
            application.applied_date
        )}
                        </p>

                    </div>


                    <div class="col-md-4 text-md-end mt-3 mt-md-0">

                        <span class="status-badge ${statusClass}">
                            ${escapeHtml(
            application.status ||
            "Applied"
        )}
                        </span>

                    </div>

                </div>

            </div>
        `;

    }).join("");
}


// =========================================================
// STUDENT DASHBOARD
// =========================================================

async function loadStudentDashboard() {

    if (!requireStudent()) {
        return;
    }


    document.getElementById("studentWelcome").textContent =
        `Welcome, ${currentUser.full_name}`;


    try {

        const jobsResponse =
            await fetch(`${API_BASE_URL}/jobs`);


        if (jobsResponse.ok) {

            const jobs =
                await jobsResponse.json();

            document.getElementById("studentJobCount")
                .textContent = jobs.length;
        }


        const applicationResponse =
            await fetch(
                `${API_BASE_URL}/applications/${currentUser.user_id}`,
                {
                    headers: getAuthHeaders()
                }
            );


        if (applicationResponse.ok) {

            const applications =
                await applicationResponse.json();

            document.getElementById(
                "studentApplicationCount"
            ).textContent = applications.length;
        }


    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );
    }
}


// =========================================================
// CREATE JOB
// =========================================================

async function handleCreateJob(event) {

    event.preventDefault();


    if (!requireRecruiter()) {
        return;
    }


    const jobData = {

        posted_by_user_id:
            currentUser.user_id,

        job_title:
            document.getElementById("jobTitle").value.trim(),

        company_name:
            document.getElementById("companyName").value.trim(),

        location:
            document.getElementById("jobLocationCreate").value.trim(),

        job_description:
            document.getElementById("jobDescription").value.trim(),

        skills_required:
            document.getElementById("jobSkills").value.trim(),

        salary:
            document.getElementById("jobSalary").value.trim(),

        application_deadline:
            document.getElementById("jobDeadline").value
    };


    try {

        const response = await fetch(
            `${API_BASE_URL}/jobs`,
            {
                method: "POST",

                headers: getJsonAuthHeaders(),

                body: JSON.stringify(jobData)
            }
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            showAlert(message, "danger");

            return;
        }


        const data = await response.json();


        showAlert(
            data.message ||
            "Job posted successfully.",
            "success"
        );


        document.getElementById("createJobForm").reset();


        loadRecruiterDashboard();


    } catch (error) {

        showAlert(
            "Unable to create job.",
            "danger"
        );
    }
}


// =========================================================
// RECRUITER DASHBOARD
// =========================================================

async function loadRecruiterDashboard() {

    if (!requireRecruiter()) {
        return;
    }


    document.getElementById("recruiterWelcome").textContent =
        `Welcome, ${currentUser.full_name}`;


    document.getElementById("recruiterRole").textContent =
        currentUser.role;


    await loadRecruiterJobs();

    await loadRecruiterApplications();
}


// =========================================================
// LOAD RECRUITER JOBS
// =========================================================

async function loadRecruiterJobs() {

    const container =
        document.getElementById(
            "recruiterJobsContainer"
        );

    try {

        const response =
            await fetch(
                `${API_BASE_URL}/recruiter/jobs`,
                {
                    headers: getAuthHeaders()
                }
            );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHtml(message)}
                </div>
            `;

            return;
        }


        const jobs =
            await response.json();


        document.getElementById(
            "recruiterJobCount"
        ).textContent =
            jobs.filter(job => job.is_active).length;


        if (!jobs.length) {

            container.innerHTML = `
                <p class="text-muted">
                    No jobs available.
                </p>
            `;

            return;
        }


        container.innerHTML = `

            <div class="table-responsive">

                <table class="table table-hover">

                    <thead>

                        <tr>
                            <th>ID</th>
                            <th>Job</th>
                            <th>Company</th>
                            <th>Location</th>
                            <th>Deadline</th>
                            <th>Action</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${jobs.map(job => `

                            <tr>

                                <td>
                                    ${job.job_id}
                                </td>

                                <td>
                                    ${escapeHtml(
            job.job_title
        )}
                                </td>

                                <td>
                                    ${escapeHtml(
            job.company_name
        )}
                                </td>

                                <td>
                                    ${escapeHtml(
            job.location || "-"
        )}
                                </td>

                                <td>
                                    ${formatDate(
            job.application_deadline
        )}
                                </td>

                                <td>

                                    <button
                                        class="btn btn-sm btn-outline-primary"
                                        onclick="viewJobDetails(${job.job_id})"
                                    >
                                        View
                                    </button>

                                    ${job.is_active
                ? `
                                            <button
                                                class="btn btn-sm btn-outline-danger"
                                                onclick="deactivateJob(${job.job_id})"
                                            >
                                                Deactivate
                                            </button>
                                          `
                : `
                                            <button
                                                class="btn btn-sm btn-outline-success"
                                                onclick="reactivateJob(${job.job_id})"
                                            >
                                                Reactivate
                                            </button>
                                          `
            }

                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>
        `;


    } catch (error) {

        container.innerHTML = `
            <div class="alert alert-danger">
                Unable to load jobs.
            </div>
        `;
    }
}

// =========================================================
// DEACTIVATE JOB
// =========================================================

async function deactivateJob(jobId) {

    if (!requireRecruiter()) {
        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to deactivate this job?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/jobs/${jobId}`,
            {
                method: "DELETE",

                headers: getJsonAuthHeaders(),

                body: JSON.stringify({
                    user_id: currentUser.user_id
                })
            }
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            showAlert(message, "danger");

            return;
        }


        const data = await response.json();


        showAlert(
            data.message ||
            "Job deactivated successfully.",
            "success"
        );


        loadRecruiterDashboard();


    } catch (error) {

        showAlert(
            "Unable to deactivate job.",
            "danger"
        );
    }
}

// =========================================================
// REACTIVATE JOB
// =========================================================

async function reactivateJob(jobId) {

    if (!requireRecruiter()) {
        return;
    }


    const confirmed =
        confirm(
            "Are you sure you want to reactivate this job?"
        );


    if (!confirmed) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/jobs/${jobId}/reactivate`,
            {
                method: "PUT",

                headers: getJsonAuthHeaders()
            }
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            showAlert(message, "danger");

            return;
        }


        const data = await response.json();


        showAlert(
            data.message ||
            "Job reactivated successfully.",
            "success"
        );


        loadRecruiterDashboard();


    } catch (error) {

        showAlert(
            "Unable to reactivate job.",
            "danger"
        );
    }
}

// =========================================================
// RECRUITER APPLICATIONS
// =========================================================

async function loadRecruiterApplications() {

    const container =
        document.getElementById(
            "recruiterApplicationsContainer"
        );


    try {

        const response =
            await fetch(
                `${API_BASE_URL}/recruiter/applications`,
                {
                    headers: getAuthHeaders()
                }
            );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            container.innerHTML = `
                <div class="alert alert-danger">
                    ${escapeHtml(message)}
                </div>
            `;

            return;
        }


        const applications =
            await response.json();


        document.getElementById(
            "recruiterApplicationCount"
        ).textContent = applications.length;


        if (!applications.length) {

            container.innerHTML = `
                <p class="text-muted">
                    No applications available.
                </p>
            `;

            return;
        }


        container.innerHTML = `

            <div class="table-responsive">

                <table class="table table-hover">

                    <thead>

                        <tr>
                            <th>Application</th>
                            <th>Student</th>
                            <th>Job</th>
                            <th>Company</th>
                            <th>Status</th>
                            <th>Update</th>
                        </tr>

                    </thead>

                    <tbody>

                        ${applications.map(application => `

                            <tr>

                                <td>
                                    #${application.application_id}
                                </td>

                                <td>
                                    ${escapeHtml(
            application.student_name ||
            application.full_name ||
            "-"
        )}
                                </td>

                                <td>
                                    ${escapeHtml(
            application.job_title ||
            "-"
        )}
                                </td>

                                <td>
                                    ${escapeHtml(
            application.company_name ||
            "-"
        )}
                                </td>

                                <td>

                                    <span class="status-badge ${getStatusClass(application.status)}">
                                        ${escapeHtml(
            application.status
        )}
                                    </span>

                                </td>

                                <td>

                                    <select
                                        class="form-select form-select-sm"
                                        id="status-${application.application_id}"
                                        onchange="updateApplicationStatus(${application.application_id})"
                                    >

                                        <option value="">
                                            Change status
                                        </option>

                                        <option value="Applied">
                                            Applied
                                        </option>

                                        <option value="Shortlisted">
                                            Shortlisted
                                        </option>

                                        <option value="Rejected">
                                            Rejected
                                        </option>

                                        <option value="Selected">
                                            Selected
                                        </option>

                                    </select>

                                </td>

                            </tr>

                        `).join("")}

                    </tbody>

                </table>

            </div>
        `;


    } catch (error) {

        container.innerHTML = `
            <div class="alert alert-danger">
                Unable to load applications.
            </div>
        `;
    }
}


// =========================================================
// UPDATE APPLICATION STATUS
// =========================================================

async function updateApplicationStatus(applicationId) {

    if (!requireRecruiter()) {
        return;
    }


    const select =
        document.getElementById(
            `status-${applicationId}`
        );


    const status = select.value;


    if (!status) {
        return;
    }


    try {

        const response = await fetch(
            `${API_BASE_URL}/recruiter/applications/${applicationId}/status`,
            {
                method: "PUT",

                headers: getJsonAuthHeaders(),

                body: JSON.stringify({

                    user_id:
                        currentUser.user_id,

                    status:
                        status
                })
            }
        );


        if (!response.ok) {

            const message =
                await getErrorMessage(response);

            showAlert(message, "danger");

            return;
        }


        const data = await response.json();


        showAlert(
            data.message ||
            "Application status updated.",
            "success"
        );


        loadRecruiterApplications();


    } catch (error) {

        showAlert(
            "Unable to update application status.",
            "danger"
        );
    }
}


// =========================================================
// UTILITY - STATUS CLASS
// =========================================================

function getStatusClass(status) {

    switch (String(status).toLowerCase()) {

        case "applied":
            return "status-applied";

        case "shortlisted":
            return "status-shortlisted";

        case "rejected":
            return "status-rejected";

        case "selected":
            return "status-selected";

        default:
            return "status-applied";
    }
}


// =========================================================
// UTILITY - DATE FORMAT
// =========================================================

function formatDate(dateValue) {

    if (!dateValue) {
        return "Not specified";
    }


    const date = new Date(dateValue);


    if (isNaN(date.getTime())) {
        return String(dateValue);
    }


    return date.toLocaleDateString(
        "en-IN",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// =========================================================
// UTILITY - HTML ESCAPE
// =========================================================

function escapeHtml(value) {

    if (value === null || value === undefined) {
        return "";
    }


    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}