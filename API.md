# API Documentation

## Authentication
All endpoints require session-based authentication unless specified.

## Common Headers
```
Content-Type: application/json
Authorization: Bearer <token>
```

## Base URLs
- Production: https://api.saas-rh.com
- Staging: https://api.staging.saas-rh.com

## Endpoints

### Employee Management
#### GET /employees
Returns all employees.

Response:
```json
[
  {
    "id": "string",
    "nombre": "string",
    "puesto": "string",
    "departamento": "string",
    "salario": "number",
    "check_in": "string",
    "check_out": "string"
  }
]
```

### Attendance
#### POST /attendance
Register attendance.

Request:
```json
{
  "employee_id": "string",
  "justificacion": "string"
}
```

Response:
```json
{
  "message": "string",
  "requireJustification": "boolean"
}
```

### Payroll
#### GET /nomina/planilla
Generate payroll report.

Query Parameters:
- periodo: YYYY-MM
- quincena: 1|2

Response: PDF file

## Error Responses
```json
{
  "status": "error",
  "message": "string",
  "requestId": "string"
}
```

## Rate Limits
- 100 requests per 15 minutes per IP
- Payroll endpoints: 30 requests per hour

## Monitoring
Each endpoint reports:
- Response time
- Error rate
- Success rate
- Request volume
