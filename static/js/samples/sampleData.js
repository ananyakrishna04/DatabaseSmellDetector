/**
 * SchemaSense - Built-in Academic Sample Database Schemas
 * 4 problem-rich demonstration schemas + 1 clean benchmark schema
 */

const SAMPLE_SCHEMAS = [
    {
        id: 'student-mgmt',
        title: 'Sample 1: Student Management System',
        description: 'Demonstrates missing primary/foreign keys, transitive functional dependencies (3NF violation), derived age column, and update anomalies.',
        syllabusFocus: 'Module 1 & Module 2: Constraints, Referential Integrity, 2NF/3NF Decomposition',
        sql: `-- ==========================================================
-- Sample 1: Student Management System
-- Issues: Missing FK constraints, 3NF violation, derived age
-- ==========================================================

CREATE TABLE Student (
    student_id INT,
    student_name VARCHAR(100),
    date_of_birth DATE,
    age INT,
    department_id INT,
    department_name VARCHAR(100),
    department_head VARCHAR(100),
    phone_numbers VARCHAR(255),
    data VARCHAR(50)
);

CREATE TABLE Course (
    course_id INT PRIMARY KEY,
    course_name VARCHAR(100),
    department_id INT,
    credits INT
);

CREATE TABLE Enrollment (
    student_id INT,
    course_id INT,
    enrollment_date DATE,
    grade VARCHAR(2),
    student_name VARCHAR(100),
    PRIMARY KEY (student_id, course_id)
);
`,
        functionalDependencies: `student_id -> student_name, date_of_birth, department_id
department_id -> department_name, department_head
course_id -> course_name, credits
student_id, course_id -> grade, enrollment_date`,
        suggestedRedesign: {
            description: 'Decompose Student into Student (3NF) and Department (3NF), drop redundant student_name from Enrollment, and enforce foreign keys.',
            before: `Student (student_id, student_name, dob, age, department_id, department_name, dept_head, phone_numbers)
Course (course_id, course_name, department_id, credits)
Enrollment (student_id, course_id, student_name, grade)`,
            after: `Department (
    department_id INT PRIMARY KEY,
    department_name VARCHAR(100) NOT NULL UNIQUE,
    department_head VARCHAR(100) NOT NULL
);

Student (
    student_id INT PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    date_of_birth DATE NOT NULL,
    department_id INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES Department(department_id)
);

StudentPhone (
    student_id INT,
    phone_number VARCHAR(20),
    PRIMARY KEY (student_id, phone_number),
    FOREIGN KEY (student_id) REFERENCES Student(student_id)
);

Course (
    course_id INT PRIMARY KEY,
    course_name VARCHAR(100) NOT NULL,
    department_id INT NOT NULL,
    credits INT NOT NULL,
    FOREIGN KEY (department_id) REFERENCES Department(department_id)
);

Enrollment (
    student_id INT,
    course_id INT,
    enrollment_date DATE NOT NULL,
    grade VARCHAR(2),
    PRIMARY KEY (student_id, course_id),
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);`
        }
    },
    {
        id: 'hospital-mgmt',
        title: 'Sample 2: Hospital Management System',
        description: 'Demonstrates repeating groups (doctor1, doctor2), multivalued comma-separated attributes, invalid foreign keys, and redundant doctor information.',
        syllabusFocus: 'Module 1 & Module 2: 1NF Violations, Foreign Key Datatype Inconsistencies',
        sql: `-- ==========================================================
-- Sample 2: Hospital Management System
-- Issues: Repeating groups (symptom1, symptom2), 1NF multivalued,
--         missing PK, datatype mismatches on patient_id
-- ==========================================================

CREATE TABLE Patient (
    patient_id VARCHAR(50) PRIMARY KEY,
    patient_name VARCHAR(100),
    phone1 VARCHAR(15),
    phone2 VARCHAR(15),
    emergency_contact VARCHAR(100),
    allergies VARCHAR(255),
    status VARCHAR(20)
);

CREATE TABLE Doctor (
    doctor_id INT PRIMARY KEY,
    doctor_name VARCHAR(100),
    specialization VARCHAR(100),
    department_name VARCHAR(100)
);

CREATE TABLE Appointment (
    appointment_id INT PRIMARY KEY,
    patient_id INT,
    doctor_id INT,
    appointment_date DATE,
    doctor_name VARCHAR(100),
    symptom1 VARCHAR(100),
    symptom2 VARCHAR(100),
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id)
);

CREATE TABLE Treatment (
    patient_id VARCHAR(50),
    treatment_name VARCHAR(100),
    cost DECIMAL(10,2),
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)
);
`,
        functionalDependencies: `patient_id -> patient_name, emergency_contact
doctor_id -> doctor_name, specialization, department_name
appointment_id -> patient_id, doctor_id, appointment_date`,
        suggestedRedesign: {
            description: 'Normalize symptoms and phone numbers into atomic child relations; unify patient_id data types; drop redundant doctor_name from Appointment.',
            before: `Patient (patient_id, name, phone1, phone2, allergies)
Appointment (appointment_id, patient_id, doctor_id, doctor_name, symptom1, symptom2)`,
            after: `Patient (
    patient_id INT PRIMARY KEY,
    patient_name VARCHAR(100) NOT NULL,
    emergency_contact VARCHAR(100)
);

PatientPhone (
    patient_id INT,
    phone_number VARCHAR(15),
    PRIMARY KEY (patient_id, phone_number),
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id)
);

Doctor (
    doctor_id INT PRIMARY KEY,
    doctor_name VARCHAR(100) NOT NULL,
    specialization VARCHAR(100) NOT NULL
);

Appointment (
    appointment_id INT PRIMARY KEY,
    patient_id INT NOT NULL,
    doctor_id INT NOT NULL,
    appointment_date DATE NOT NULL,
    FOREIGN KEY (patient_id) REFERENCES Patient(patient_id),
    FOREIGN KEY (doctor_id) REFERENCES Doctor(doctor_id)
);

AppointmentSymptom (
    appointment_id INT,
    symptom VARCHAR(100),
    PRIMARY KEY (appointment_id, symptom),
    FOREIGN KEY (appointment_id) REFERENCES Appointment(appointment_id)
);`
        }
    },
    {
        id: 'ecommerce-system',
        title: 'Sample 3: E-Commerce System',
        description: 'Demonstrates physical design issues (missing index on FK, duplicate index, low-selectivity index), partial dependency (2NF violation), and derived total_amount.',
        syllabusFocus: 'Module 2 & Module 3: 2NF Partial Dependencies & B+ Tree Physical Indexing Optimization',
        sql: `-- ==========================================================
-- Sample 3: E-Commerce System
-- Issues: 2NF violation in OrderItems, duplicate index,
--         missing index on customer_id, derived total
-- ==========================================================

CREATE TABLE Customer (
    customer_id INT PRIMARY KEY,
    customer_name VARCHAR(100) NOT NULL,
    email VARCHAR(150),
    shipping_address VARCHAR(255)
);

CREATE TABLE Orders (
    order_id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    total_amount DECIMAL(10,2),
    is_active BOOLEAN,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id)
);

-- Physical design: low-selectivity index on boolean flag
CREATE INDEX idx_orders_active ON Orders (is_active);

CREATE TABLE OrderItems (
    order_id INT,
    product_id INT,
    product_name VARCHAR(150),
    unit_price DECIMAL(10,2),
    quantity INT NOT NULL,
    item_total DECIMAL(10,2),
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES Orders(order_id)
);

-- Redundant index: idx_items_order is identical/left prefix
CREATE INDEX idx_items_order ON OrderItems (order_id);
CREATE INDEX idx_items_order_comp ON OrderItems (order_id, product_id);
`,
        functionalDependencies: `customer_id -> customer_name, email, shipping_address
order_id -> customer_id, order_date, total_amount
product_id -> product_name, unit_price
order_id, product_id -> quantity`,
        suggestedRedesign: {
            description: 'Extract Product entity into a separate relation to eliminate 2NF partial dependency in OrderItems; clean up redundant indexes.',
            before: `OrderItems (order_id, product_id, product_name, unit_price, quantity, item_total)`,
            after: `Product (
    product_id INT PRIMARY KEY,
    product_name VARCHAR(150) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL
);

Orders (
    order_id INT PRIMARY KEY,
    customer_id INT NOT NULL,
    order_date DATE NOT NULL,
    FOREIGN KEY (customer_id) REFERENCES Customer(customer_id)
);
CREATE INDEX idx_orders_customer ON Orders (customer_id);

OrderItems (
    order_id INT,
    product_id INT,
    quantity INT NOT NULL CHECK (quantity > 0),
    PRIMARY KEY (order_id, product_id),
    FOREIGN KEY (order_id) REFERENCES Orders(order_id),
    FOREIGN KEY (product_id) REFERENCES Product(product_id)
);`
        }
    },
    {
        id: 'library-mgmt',
        title: 'Sample 4: Library Management System',
        description: 'Demonstrates missing constraints, missing foreign keys, non-atomic subjects, 3NF violation in Publisher info, and insert/delete anomalies.',
        syllabusFocus: 'Module 1 & Module 2: Key Constraints, Entity Integrity, Transitive Dependencies',
        sql: `-- ==========================================================
-- Sample 4: Library Management System
-- Issues: Missing FK, missing PK in Borrower, 3NF violation,
--         multivalued subjects
-- ==========================================================

CREATE TABLE Book (
    book_id INT PRIMARY KEY,
    title VARCHAR(200),
    isbn VARCHAR(20),
    publisher_id INT,
    publisher_name VARCHAR(150),
    publisher_city VARCHAR(100),
    subjects VARCHAR(255)
);

CREATE TABLE Member (
    member_id INT PRIMARY KEY,
    member_name VARCHAR(100),
    email VARCHAR(150),
    phone VARCHAR(20)
);

CREATE TABLE Loan (
    loan_id INT,
    book_id INT,
    member_id INT,
    borrow_date DATE,
    due_date DATE,
    return_date DATE
);
`,
        functionalDependencies: `book_id -> title, isbn, publisher_id
publisher_id -> publisher_name, publisher_city
member_id -> member_name, email, phone
loan_id -> book_id, member_id, borrow_date, due_date`,
        suggestedRedesign: {
            description: 'Decompose Publisher into its own table; add primary key and foreign keys to Loan; enforce unique constraint on ISBN.',
            before: `Book (book_id, title, isbn, publisher_id, publisher_name, publisher_city, subjects)
Loan (loan_id, book_id, member_id, borrow_date)`,
            after: `Publisher (
    publisher_id INT PRIMARY KEY,
    publisher_name VARCHAR(150) NOT NULL,
    publisher_city VARCHAR(100)
);

Book (
    book_id INT PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    isbn VARCHAR(20) NOT NULL UNIQUE,
    publisher_id INT NOT NULL,
    FOREIGN KEY (publisher_id) REFERENCES Publisher(publisher_id)
);

BookSubject (
    book_id INT,
    subject VARCHAR(50),
    PRIMARY KEY (book_id, subject),
    FOREIGN KEY (book_id) REFERENCES Book(book_id)
);

Member (
    member_id INT PRIMARY KEY,
    member_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20)
);

Loan (
    loan_id INT PRIMARY KEY,
    book_id INT NOT NULL,
    member_id INT NOT NULL,
    borrow_date DATE NOT NULL,
    due_date DATE NOT NULL,
    return_date DATE,
    FOREIGN KEY (book_id) REFERENCES Book(book_id),
    FOREIGN KEY (member_id) REFERENCES Member(member_id)
);`
        }
    },
    {
        id: 'perfect-schema',
        title: 'Benchmark: Perfectly Designed Academic Schema',
        description: 'Demonstrates a rigorous, fully normalized (3NF / BCNF) relational schema adhering to all course guidelines with proper foreign keys, NOT NULL constraints, unique indexes, and no smell violations.',
        syllabusFocus: 'All Modules (1 to 5): Clean Relational Design, Full Constraint Enforcement & Proper Indexing',
        sql: `-- ==========================================================
-- Benchmark: Perfectly Designed Academic Schema
-- Demonstrates 0 critical smells, full 3NF/BCNF normalization
-- ==========================================================

CREATE TABLE Department (
    dept_id INT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL UNIQUE,
    budget DECIMAL(12,2) NOT NULL
);

CREATE TABLE Instructor (
    instructor_id INT PRIMARY KEY,
    instructor_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    dept_id INT NOT NULL,
    FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
);
CREATE INDEX idx_instructor_dept ON Instructor (dept_id);

CREATE TABLE Course (
    course_id INT PRIMARY KEY,
    course_title VARCHAR(150) NOT NULL,
    credits INT NOT NULL,
    dept_id INT NOT NULL,
    FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
);
CREATE INDEX idx_course_dept ON Course (dept_id);

CREATE TABLE Student (
    student_id INT PRIMARY KEY,
    student_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    date_of_birth DATE NOT NULL,
    dept_id INT NOT NULL,
    FOREIGN KEY (dept_id) REFERENCES Department(dept_id)
);
CREATE INDEX idx_student_dept ON Student (dept_id);

CREATE TABLE Enrollment (
    student_id INT NOT NULL,
    course_id INT NOT NULL,
    enrollment_semester VARCHAR(20) NOT NULL,
    grade VARCHAR(2),
    PRIMARY KEY (student_id, course_id, enrollment_semester),
    FOREIGN KEY (student_id) REFERENCES Student(student_id),
    FOREIGN KEY (course_id) REFERENCES Course(course_id)
);
CREATE INDEX idx_enrollment_course ON Enrollment (course_id);
`,
        functionalDependencies: `dept_id -> dept_name, budget
instructor_id -> instructor_name, email, dept_id
course_id -> course_title, credits, dept_id
student_id -> student_name, email, date_of_birth, dept_id
student_id, course_id, enrollment_semester -> grade`,
        suggestedRedesign: {
            description: 'This schema is already in Boyce-Codd Normal Form (BCNF) and enforces all entity and referential integrity constraints.',
            before: 'Perfect schema',
            after: 'No restructuring required.'
        }
    }
];

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SAMPLE_SCHEMAS };
}
