# Complete API Reference

## Automation Endpoints

### 1. Individual Step Endpoints

#### Authenticate
```http
POST /api/v1/automation/auth/naukri
```
**Opens headed browser for manual Naukri login**

Response:
```json
{
  "success": true,
  "data": {
    "message": "Authentication successful. Storage state saved."
  }
}
```

---

#### Scrape Jobs
```http
POST /api/v1/automation/scrape
Content-Type: application/json

{
  "maxJobs": 50
}
```

Response:
```json
{
  "success": true,
  "data": {
    "jobsScraped": 45,
    "jobs": [
      {
        "title": "Senior Backend Developer",
        "company": "TechCorp",
        "location": "Remote",
        "salary": 1200000,
        "description": "..."
      }
    ]
  }
}
```

---

#### Apply to Jobs
```http
POST /api/v1/automation/apply
Content-Type: application/json

{
  "threshold": 70
}
```

Response:
```json
{
  "success": true,
  "data": {
    "applied": 12,
    "skipped": 8,
    "failed": 2
  }
}
```

---

#### Get Status
```http
GET /api/v1/automation/status
```

Response:
```json
{
  "success": true,
  "data": {
    "isRunning": false,
    "jobsScraped": 45,
    "jobsApplied": 12,
    "lastError": null
  }
}
```

---

#### Stop Automation
```http
POST /api/v1/automation/stop
```

Response:
```json
{
  "success": true,
  "data": {},
  "message": "Automation stopped"
}
```

---

### 2. Full Pipeline Endpoint

#### Run Complete Pipeline
```http
POST /api/v1/automation/full
Content-Type: application/json

{
  "skipAuth": false,
  "maxJobs": 50,
  "matchThreshold": 70,
  "tailorResume": true,
  "uploadToProfile": true
}
```

**Parameters:**
- `skipAuth` (boolean, default: false) - Skip Naukri authentication
- `maxJobs` (number, default: 50) - Max jobs to scrape
- `matchThreshold` (number, default: 70) - Min AI score to apply
- `tailorResume` (boolean, default: true) - Customize resume per job
- `uploadToProfile` (boolean, default: true) - Upload to Naukri profile

**Response:**
```json
{
  "success": true,
  "data": {
    "currentStep": "completed",
    "completed": true,
    "jobsScraped": 45,
    "jobsRated": 45,
    "jobsApplied": 28,
    "resumesTailored": 5,
    "errors": []
  },
  "message": "Full automation pipeline completed"
}
```

---

## User Endpoints

### Upload Resume
```http
POST /api/v1/users/:userId/resume
Content-Type: multipart/form-data

file: resume.txt
```

Response:
```json
{
  "success": true,
  "data": {
    "resume": {
      "path": "./uploads/resumes/<userId>/resume.txt",
      "fileName": "resume.txt",
      "uploadedAt": "2026-09-09T13:20:00.000Z"
    }
  }
}
```

---

### Get Applications
```http
GET /api/v1/users/:userId/applications
```

Response:
```json
{
  "success": true,
  "data": {
    "applications": [
      {
        "_id": "...",
        "title": "Backend Developer",
        "company": "TechCorp",
        "appliedAt": "2026-09-09T13:25:00.000Z",
        "applicationStatus": "applied",
        "geminiScore": 85
      }
    ],
    "count": 28
  }
}
```

---

### Update Job Preferences
```http
PUT /api/v1/users/:userId/preferences
Content-Type: application/json

{
  "keywords": ["Node.js", "TypeScript", "Backend"],
  "locations": ["Remote", "Bangalore"],
  "minSalary": 500000,
  "jobTypes": ["full-time"],
  "employType": ["remote", "hybrid"]
}
```

---

### Get Stats
```http
GET /api/v1/users/:userId/stats
```

Response:
```json
{
  "success": true,
  "data": {
    "totalJobs": 98,
    "applied": 28,
    "skipped": 45,
    "failed": 2,
    "pending": 23
  }
}
```

---

## Job Endpoints

### Create Job
```http
POST /api/v1/jobs
Content-Type: application/json

{
  "title": "Senior Backend Developer",
  "description": "...",
  "company": "TechCorp",
  "location": "Remote",
  "type": "full-time",
  "employType": "remote",
  "salary": 1200000,
  "staticLink": "https://naukri.com/..."
}
```

---

### Get All Jobs
```http
GET /api/v1/jobs
```

---

### Get Job by ID
```http
GET /api/v1/jobs/:jobId
```

---

### Update Job
```http
PUT /api/v1/jobs/:jobId
```

---

### Delete Job
```http
DELETE /api/v1/jobs/:jobId
```

---

## cURL Examples

### Complete Workflow

**1. Authenticate**
```bash
curl -X POST http://localhost:8000/api/v1/automation/auth/naukri
```

**2. Set Preferences**
```bash
curl -X PUT http://localhost:8000/api/v1/users/<userId>/preferences \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["Node.js", "TypeScript"],
    "locations": ["Remote"],
    "minSalary": 500000,
    "jobTypes": ["full-time"],
    "employType": ["remote"]
  }'
```

**3. Upload Resume**
```bash
curl -X POST http://localhost:8000/api/v1/users/<userId>/resume \
  -F "resume=@./resume.txt"
```

**4. Run Full Pipeline**
```bash
curl -X POST http://localhost:8000/api/v1/automation/full \
  -H "Content-Type: application/json" \
  -d '{
    "maxJobs": 50,
    "matchThreshold": 70,
    "tailorResume": true,
    "uploadToProfile": true
  }'
```

**5. Check Results**
```bash
curl http://localhost:8000/api/v1/users/<userId>/stats
curl http://localhost:8000/api/v1/users/<userId>/applications
```

---

## Response Format

All endpoints return standardized responses:

### Success
```json
{
  "success": true,
  "data": { /* endpoint-specific data */ },
  "message": "Operation completed"
}
```

### Error
```json
{
  "success": false,
  "error": "Error message",
  "statusCode": 400
}
```

---

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad request
- `401` - Unauthorized
- `404` - Not found
- `500` - Server error

---

**All endpoints ready to use! 🚀**
