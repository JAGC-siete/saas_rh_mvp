-- init.sql
CREATE TABLE IF NOT EXISTS employees (...);  -- sin depender de roles externos

-- Crear tabla de empleados
CREATE TABLE employees (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    departament TEXT,
    base_salary REAL NOT NULL,
    checkin_time TIME,
    checkout_time TIME,
    fecha_ingreso DATE,
    banco TEXT,
    cuenta TEXT
);

-- Tabla para control diario de asistencia
CREATE TABLE asistance (
    id SERIAL PRIMARY KEY,
    id_empleado UUID REFERENCES employees(id),
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    justificacion TEXT
);

-- Tabla de payroll (planilla)
CREATE TABLE payroll (
    id SERIAL PRIMARY KEY,
    id_empleado UUID REFERENCES employees(id),
    periodo TEXT NOT NULL,
    salario_bruto REAL NOT NULL,
    deducciones REAL DEFAULT 0,
    salario_neto REAL NOT NULL
);


