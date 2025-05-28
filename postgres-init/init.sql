-- init.sql
-- Crear tabla de empleados
CREATE TABLE IF NOT EXISTS employees (
    id VARCHAR(20) PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT,
    departament TEXT,
    base_salary REAL NOT NULL,
    checkin_time TIME,
    checkout_time TIME,
    fecha_ingreso DATE,
    banco TEXT,
    cuenta TEXT,
    status TEXT DEFAULT 'Activo'
);

-- Tabla para control diario de asistencia
CREATE TABLE IF NOT EXISTS attendance (
    id_empleado VARCHAR(20) NOT NULL,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    justificacion TEXT,
    PRIMARY KEY (id_empleado, date),
    FOREIGN KEY (id_empleado) REFERENCES employees(id)
);

-- Tabla de payroll (planilla)
CREATE TABLE IF NOT EXISTS payroll (
    id SERIAL PRIMARY KEY,
    id_empleado VARCHAR(20) REFERENCES employees(id),
    periodo TEXT NOT NULL,
    salario_bruto REAL NOT NULL,
    deducciones REAL DEFAULT 0,
    salario_neto REAL NOT NULL
);


