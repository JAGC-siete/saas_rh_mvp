# 📋 Parameter Standardization - Attendance System

## Overview
This document outlines the standardized parameter naming conventions across the attendance system frontend, backend APIs, and SQL RPC functions.

## 🎯 Standardized Parameters

### Time Range Parameters
- **✅ STANDARD**: `preset` - Time period preset (today, week, month, etc.)
- **❌ REMOVED**: `scope` - Legacy compatibility parameter (removed)
- **✅ STANDARD**: `from` - Start date (YYYY-MM-DD format)  
- **✅ STANDARD**: `to` - End date (YYYY-MM-DD format)

### Employee Parameters  
- **✅ STANDARD**: `employee_id` - UUID format employee identifier
- **❌ AVOID**: `employeeId` - CamelCase variant (use snake_case)

### Filter Parameters
- **✅ STANDARD**: `type` - Filter type (absent, late, early)
- **✅ STANDARD**: `role` - Employee role filter
- **✅ STANDARD**: `format` - Export format (csv, json)

### SQL RPC Parameters
All RPC function parameters use the `p_` prefix for consistency:
- **✅ STANDARD**: `p_employee_id` - Employee UUID parameter
- **✅ STANDARD**: `p_from` - Start date parameter  
- **✅ STANDARD**: `p_to` - End date parameter
- **✅ STANDARD**: `p_type` - Filter type parameter
- **✅ STANDARD**: `p_role` - Role filter parameter
- **✅ STANDARD**: `p_grain` - Aggregation granularity parameter

## 📡 Updated API Endpoints

### GET `/api/attendance/lists`
```
?preset=today&type=absent&employee_id=uuid&role=admin&from=2024-01-01&to=2024-01-31
```

### GET `/api/attendance/kpis` 
```
?preset=week&employee_id=uuid&role=admin&from=2024-01-01&to=2024-01-31
```

### GET `/api/attendance/export`
```
?preset=month&format=csv&employee_id=uuid&from=2024-01-01&to=2024-01-31
```

### GET `/api/attendance/employee/[id]`
```
?preset=week&from=2024-01-01&to=2024-01-31
```

### GET `/api/attendance/aggregate`
```
?grain=day&from=2024-01-01&to=2024-01-31
```

## 🗄️ Updated SQL RPC Functions

### attendance_lists_filtered()
```sql
attendance_lists_filtered(
  p_employee_id UUID DEFAULT NULL,
  p_from TEXT DEFAULT NULL, 
  p_to TEXT DEFAULT NULL,
  p_type TEXT DEFAULT 'absent',
  p_role TEXT DEFAULT NULL
)
```

### attendance_export()
```sql
attendance_export(
  p_employee_id UUID DEFAULT NULL,
  p_from TEXT DEFAULT NULL,
  p_to TEXT DEFAULT NULL  
)
```

### attendance_employee_timeline()
```sql
attendance_employee_timeline(
  p_employee_id UUID,
  p_from TEXT DEFAULT NULL,
  p_to TEXT DEFAULT NULL
)
```

### attendance_aggregate()
```sql
attendance_aggregate(
  p_grain TEXT DEFAULT 'day',
  p_from TEXT DEFAULT NULL,
  p_to TEXT DEFAULT NULL
)
```

## ✅ Benefits Achieved

1. **🔄 Consistency**: All parameters use the same naming convention
2. **🚫 No More Confusion**: Removed `preset` vs `scope` confusion  
3. **🛠️ Maintainability**: Easier to understand and maintain code
4. **🔍 Debugging**: Clear parameter flow from frontend to database
5. **📚 Documentation**: Self-documenting parameter names

## 🚨 Breaking Changes

- **REMOVED**: `scope` parameter support (use `preset` instead)
- **UPDATED**: SQL RPC functions now use `p_` prefixed parameters
- **STANDARDIZED**: All employee IDs use `employee_id` (not `employeeId`)

## 🧪 Testing

All parameter changes have been tested to ensure:
- ✅ Frontend sends correct parameter names
- ✅ Backend APIs accept standardized parameters  
- ✅ SQL RPC functions use consistent parameter naming
- ✅ No breaking changes for existing functionality
- ✅ Proper parameter validation and error handling
