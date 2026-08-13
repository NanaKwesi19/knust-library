# KNUST Library Management System

## Comprehensive Project Documentation

**Project:** KNUST Library Management System  
**Institution:** Kwame Nkrumah University of Science and Technology (KNUST), Kumasi, Ghana  
**Document Type:** Comprehensive System and Project Documentation  
**Primary User Personas:** Students and Administrators  
**Architecture:** React/Vite frontend, Node.js/Express/Prisma backend, PostgreSQL database, Python FastAPI ML service

---

## Table of Contents

1. Introduction  
2. Project Overview  
3. Problem Statement  
4. Aim and Objectives  
5. Scope of the System  
6. Target Users and Roles  
7. System Architecture  
8. Student Module  
9. Administrator Module  
10. Catalogue and Physical Inventory  
11. Borrowing and Return Management  
12. Reservation Management  
13. Digital Resources  
14. Study Rooms and Bookings  
15. Fines and Payments  
16. Notifications and Activity Tracking  
17. Help Desk and Maintenance Management  
18. Library Policies and System Settings  
19. Analytics and AI Forecasting  
20. Security and Access Control  
21. Database Design  
22. API and Backend Design  
23. Frontend Design and User Experience  
24. Important Business Rules  
25. End-to-End System Workflows  
26. Error Handling and Data Integrity  
27. Testing and Quality Assurance  
28. Deployment Architecture  
29. Demonstration and Video Guide  
30. Limitations and Future Enhancements  
31. Conclusion  
32. Appendix A: Major Data Entities  
33. Appendix B: Major System Capabilities  

---

# 1. Introduction

The KNUST Library Management System is a full-stack digital library platform designed to modernize the management and consumption of library services within a university environment. The system provides a unified environment through which students can discover library resources, interact with borrowing and reservation services, access digital resources, manage study-room bookings, view notifications and account activity, and report library or facility-related problems.

The administrator side of the platform provides centralized control over library resources, physical book inventory, circulation, reservations, digital resources, study spaces, fines, maintenance issues, reports, system configuration and operational records.

The project is intended to solve the limitations of fragmented, manual or partially digitized library processes by connecting users, resources, physical copies, transactions, policies and operational information within one application.

The project is implemented as a multi-service application. The repository describes a React/Vite frontend, a Node.js/Express API using Prisma ORM and PostgreSQL, and a Python FastAPI service for predictive analytics. The project README identifies the principal ports as 5173 for the frontend, 5000 for the backend and 8000 for the ML service.

---

# 2. Project Overview

## 2.1 What the System Is

The KNUST Library Management System is an integrated library information and service platform. It is not limited to a simple catalogue. It connects the library's resource catalogue with physical inventory, circulation, reservations, digital resources, study spaces, fines, notifications, issue reporting, maintenance and administrative analytics.

The system therefore has two major perspectives:

- **Student perspective:** finding and consuming library services.
- **Administrator perspective:** managing the resources, rules and operations that make those services possible.

## 2.2 Core Idea

The central idea is to create a single source of truth for library operations. A book is represented as a catalogue resource, while its individual physical copies are tracked separately. A borrowing transaction is linked to a specific physical copy and a student. Reservations are tracked independently from active loans. Policies are stored as configurable system settings so that operational rules do not have to be hard-coded into every interface.

## 2.3 Major Capabilities

The platform includes or is architected around:

- Student and administrator dashboards.
- Authentication and role-based access.
- Book catalogue management.
- Physical book-copy management.
- Borrowing and returns.
- Loan limits, due dates, renewals and fines.
- Book reservations and reservation queues.
- Study-room reservations.
- Digital library resources.
- Digital library identity/card functionality.
- Notifications.
- Reading/activity history.
- Library help desk functionality.
- Maintenance complaint management.
- Library policies and configurable transaction rules.
- Administrative reporting and analytics.
- Audit logging.
- Backup/configuration records.
- AI-assisted demand forecasting through the ML service.

---

# 3. Problem Statement

Traditional library operations can become difficult to manage when catalogue information, physical inventory, circulation, reservations, fines, policies and user communication are maintained separately.

Typical problems include:

1. Students cannot easily determine whether a book is available before visiting the library.
2. Students may not understand the difference between borrowing a currently available book and reserving an unavailable one.
3. Physical copies of the same catalogue title may not be tracked independently.
4. Administrators may have difficulty maintaining accurate circulation records.
5. Loan due dates, overdue status and fines require continuous tracking.
6. Reservation queues can be difficult to manage manually.
7. Digital academic resources may be scattered across different locations.
8. Students may have no structured channel for reporting library problems or facility issues.
9. Library rules may become inconsistent if they are embedded directly into different screens.
10. Management decisions are harder when historical usage data is not centralized.

The KNUST Library Management System addresses these issues by connecting the relevant processes into a single digital workflow.

---

# 4. Aim and Objectives

## 4.1 Aim

The aim of the project is to develop a comprehensive digital library management platform that improves the discovery, circulation, reservation, administration and monitoring of library resources and services at KNUST.

## 4.2 Objectives

The system seeks to:

1. Digitize library resource and catalogue management.
2. Track individual physical copies of books.
3. Provide controlled borrowing and return workflows.
4. Provide a separate reservation workflow for unavailable resources.
5. Make borrowing and reservation rules visible to students before transactions are made.
6. Allow administrators to configure operational library policies.
7. Provide digital access to academic resources through managed resource links.
8. Manage study-room and study-space reservations.
9. Track fines and payments associated with overdue loans.
10. Provide notifications and activity history to users.
11. Give students structured mechanisms for reporting issues.
12. Give administrators tools for managing maintenance complaints.
13. Provide reports and analytics for operational decision-making.
14. Use historical data to support demand forecasting and predictive analytics.
15. Maintain audit records for important administrative actions.

---

# 5. Scope of the System

## 5.1 In Scope

The system covers:

- User authentication.
- Student account information.
- Administrator operations.
- Book catalogue records.
- Physical copy inventory.
- Borrowing and returns.
- Reservations.
- Study-room bookings.
- Digital resources.
- Fines and payments.
- Notifications.
- Reading history.
- Library help desk.
- Maintenance complaints.
- Policies and library settings.
- Reporting and analytics.
- Audit records.
- AI/predictive analytics integration.

## 5.2 Out of Scope for the Primary User Model

The final user documentation intentionally defines only **Students** and **Administrators** as the application's primary user personas. Staff and Librarian are not presented as separate user journeys in this documentation because they are not part of the visible user experience being demonstrated.

This distinction is important: project documentation should describe the system that can actually be demonstrated rather than introducing personas that are not visible in the final application experience.

---

# 6. Target Users and Roles

## 6.1 Student

A student is the primary consumer of library services. Students use the platform to:

- Sign in to the library system.
- Search and explore books.
- View book information and availability.
- Understand borrowing rules.
- Borrow available physical books through the supported circulation process.
- View current loans and due dates.
- Return books through the supported process.
- View or manage reservations.
- Reserve resources where the reservation workflow permits it.
- View reservation rules before committing to a reservation.
- Access digital resources.
- Book study spaces.
- View notifications.
- View reading/activity history.
- View fines and payment information.
- Report library issues.
- Report maintenance or facility problems.
- Manage profile and notification preferences.

## 6.2 Administrator

The administrator is responsible for operating and configuring the platform. Administrative capabilities include:

- Managing users and approvals.
- Managing the catalogue.
- Creating and editing books.
- Managing physical copies and barcodes.
- Monitoring availability and copy status.
- Managing borrowing and returns.
- Monitoring overdue loans.
- Managing reservations.
- Managing digital resources.
- Managing study rooms.
- Managing fines and payments.
- Managing maintenance complaints.
- Viewing reports and analytics.
- Managing system settings and library rules.
- Reviewing audit information.
- Managing operational configuration.

---

# 7. System Architecture

## 7.1 High-Level Architecture

The application follows a three-service architecture:

```text
                    KNUST LIBRARY SYSTEM
                            |
          +-----------------+------------------+
          |                 |                  |
      Frontend           Backend            ML Service
      React/Vite       Node/Express        Python/FastAPI
          |                 |                  |
          |                 |                  |
          +---------- REST/API ---------------+
                            |
                       PostgreSQL
                            |
                          Prisma
```

## 7.2 Frontend

The frontend is a React/Vite application. It provides the user interface for students and administrators and uses technologies including React, Vite, Tailwind CSS and Framer Motion.

The frontend is responsible for presentation, navigation, user interaction, form handling and displaying server state. Business rules are enforced by the backend rather than being trusted solely to the browser.

## 7.3 Backend

The backend is implemented using Node.js and Express. Prisma is used as the ORM and PostgreSQL is the primary relational database.

The backend exposes API endpoints for authentication, books, physical copies, loans, reservations, users, digital resources, rooms, fines, notifications, maintenance and other system operations.

## 7.4 Database

PostgreSQL stores the persistent system state. Prisma provides typed access to the database and models the relationships between users, books, copies, loans, reservations, rooms, fines, notifications, resources, complaints, configuration and audit records.

## 7.5 Machine Learning Service

The project also contains a Python FastAPI ML service. The repository describes this service as supporting predictive analytics and AI forecasting, including book-demand forecasting. It is separated from the main transactional API so analytical workloads can evolve independently.

---

# 8. Student Module

The student experience is designed around the principle that a student should be able to understand a library service before committing to it.

## 8.1 Student Dashboard

The dashboard provides a central view of relevant library activity. Depending on enabled modules, this can include current borrowing information, reservations, notifications, fines, library resources and other personalized information.

## 8.2 Catalogue Explorer

The catalogue allows students to discover books and inspect resource information. Book records contain fields such as title, author, ISBN, category, shelf location, description, publisher, publication year, edition, pages, cover information and tags.

## 8.3 Book Availability

Availability is not determined solely by whether a catalogue title exists. The system tracks individual physical copies. A title can therefore have multiple copies, each with its own barcode and status.

A copy may be:

- Available.
- Borrowed.
- Reserved.
- Under maintenance.
- Lost.

This design allows the system to distinguish catalogue-level information from physical inventory.

## 8.4 Borrowed Books

Students can view their active and historical borrowing activity. Loan records include due dates, return information, loan status, renewal count and fine information.

## 8.5 Notifications

Students receive notifications for events such as due reminders, overdue alerts, book availability, booking confirmations, fines and general/system messages.

## 8.6 Digital Identity

The database includes a digital library card model containing a unique card identifier, student identifier, QR-code data, issue and expiry dates and status. This supports a digital identity concept for library services.

---

# 9. Administrator Module

The administrator workspace is the operational control centre of the platform.

## 9.1 User Management

Administrators can manage user records and account status. The system supports account states such as active, suspended and pending clearance at the data-model level.

## 9.2 Catalogue Management

Administrators can create and maintain book catalogue records. This includes core bibliographic information and resource metadata.

## 9.3 Inventory Management

The administrator can manage the relationship between a catalogue title and its physical copies. Each physical copy has a unique barcode and status.

This is essential because two copies of the same book are two different physical assets and may have different availability states.

## 9.4 Circulation Management

Administrative circulation functionality supports checking books out, recording returns, monitoring active loans and identifying overdue transactions.

## 9.5 Reservation Management

Administrators can monitor reservation activity and reservation states, including pending, fulfilled, cancelled and expired transactions.

## 9.6 Digital Resource Management

Administrators can create and manage digital resources. A digital resource record can contain a title, description, access URL, file type, category, subcategory, academic year, course code, author, publisher, authentication requirement, download count and file-size information.

## 9.7 Study Space Management

Administrators can manage study rooms, including room number, capacity, location, description, amenities and availability.

## 9.8 Fines and Payments

Administrators can monitor fines generated from overdue transactions and payment records associated with those fines.

## 9.9 Maintenance Management

Administrators can review and manage maintenance complaints submitted by students. A complaint records a title, description, room number, status, creation time, update time and optional resolution information.

## 9.10 Reporting and Audit

Administrative reporting and audit functionality supports operational accountability and analysis. Audit records can store actions, descriptions, affected entity information, user information, severity, IP address, user-agent data and additional JSON details.

---

# 10. Catalogue and Physical Inventory

One of the most important architectural decisions in the system is separating **Book** from **BookCopy**.

## 10.1 Book

A Book represents the catalogue-level resource. It describes the intellectual work rather than one physical item.

Examples of catalogue information include:

- Title.
- Author.
- ISBN.
- Category.
- Shelf location.
- Description.
- Publisher.
- Publication year.
- Edition.
- Page count.
- Tags.
- Cover information.

## 10.2 Book Copy

A BookCopy represents an individual physical copy. It has its own unique barcode and status.

This makes it possible for the system to answer questions such as:

> "There are five copies of this title, but only three are currently available."

## 10.3 Copy Lifecycle

A typical physical copy lifecycle is:

```text
Created
   |
AVAILABLE
   |
+--+-------------------+
|                      |
BORROWED            RESERVED
|                      |
RETURNED               |
|                      |
AVAILABLE              |
|
MAINTENANCE / LOST
```

The exact transition depends on the transaction being performed and the system's business rules.

---

# 11. Borrowing and Return Management

Borrowing and reservation are deliberately different operations.

## 11.1 Borrowing

Borrowing means the student receives a physical copy for a defined loan period.

A loan contains:

- Student/user.
- Physical copy.
- Due date.
- Return date.
- Status.
- Renewal count.
- Fine amount.
- Fine-paid state.

## 11.2 Borrowing Eligibility

The system checks relevant rules before creating a loan. The backend circulation workflow checks that the student exists, that the selected copy exists and that the copy is available.

The configured student borrowing limit is stored in library settings. The current database default is five books per student, while the default loan duration is fourteen days.

## 11.3 Checkout

The backend checkout process accepts a student identifier and physical-copy barcode. It validates the student, checks the student's active loan count, finds the physical copy and verifies availability.

The checkout operation then creates the loan, changes the copy status to borrowed, records reading history and creates an audit record as part of a database transaction.

## 11.4 Return

Returning a book changes the loan to returned, records the return time and changes the physical copy back to available. The system also records reading history and can calculate an overdue fine using the configured fine rate and maximum fine.

## 11.5 Renewals

The loan model includes a renewal count and the library settings include a renewal limit. This provides a configurable mechanism for controlling renewals.

## 11.6 Overdue Loans

An overdue loan is identified when its due date is earlier than the current date/time while the loan remains active. The backend can calculate days overdue and accrued fines.

The current default configuration in the database is:

| Setting | Default |
|---|---:|
| Maximum books per student | 5 |
| Loan duration | 14 days |
| Renewal limit | 2 |
| Fine rate | 2.00 per day |
| Maximum fine | 50.00 |
| Grace period | 3 days |
| Lost-book threshold | 90 days |
| Lost-book fee | 150.00 |

These values are configuration defaults, not permanent rules. Administrators can use system settings to control the operational policy where the corresponding configuration interface is enabled.

---

# 12. Reservation Management

Reservation is distinct from borrowing.

## 12.1 Borrowing vs Reservation

| Borrowing | Reservation |
|---|---|
| Gives the student an active loan | Places a request/hold for a resource or space |
| Requires an available physical copy for checkout | Can be used when the resource is not immediately available, subject to policy |
| Creates a Loan record | Creates a Reservation record |
| Has a due date | Has a reservation status and optional scheduled date |
| Can generate overdue fines | Follows reservation/expiry rules |

## 12.2 Reservation Data

The reservation model records:

- Reservation type.
- Target resource identifier.
- Optional scheduled date/time.
- Status.
- Notes.
- Student/user.
- Creation and update timestamps.

Supported reservation types include book holds, study-space reservations and discussion-room reservations at the data-model level.

## 12.3 Reservation Status

The system supports:

- **Pending:** request is waiting to be fulfilled.
- **Fulfilled:** request has been successfully fulfilled.
- **Cancelled:** request was cancelled.
- **Expired:** request passed its valid period.

## 12.4 Student Decision Flow

The intended student experience is:

```text
Find book
   |
Check availability
   |
+--+----------------------+
|                         |
Available             Unavailable
|                         |
Read borrowing        Read reservation
rules                 rules
|                         |
Borrow                Reserve
```

This distinction should be visible in the video demonstration because it explains why the platform needs both workflows.

---

# 13. Digital Resources

The Digital Library component extends the platform beyond physical books.

A digital resource may contain:

- Title.
- Description.
- Access URL.
- File type.
- Category.
- Subcategory.
- Academic year.
- Course code.
- Author.
- Publisher.
- Authentication requirement.
- Download count.
- File size.

Administrators manage these resources while students use the digital library to discover and access them.

The `requiresAuth` property allows the system to distinguish resources that require authenticated access from those that do not.

The digital-resource architecture is therefore suitable for course materials, electronic books, research documents, guides and other academic resources that can be accessed through managed links.

---

# 14. Study Rooms and Bookings

The system includes study-room management for students who need physical study spaces.

## 14.1 Study Room

A study room contains:

- Room number.
- Capacity.
- Location.
- Description.
- Amenities.
- Availability.

## 14.2 Room Booking

A booking records:

- Student/user.
- Room.
- Booking date.
- Start time.
- End time.
- Booking status.

Supported booking statuses include confirmed, cancelled, completed and no-show.

This provides a structured alternative to informal room allocation.

---

# 15. Fines and Payments

The fine subsystem connects overdue circulation with financial accountability.

## 15.1 Fine

A fine contains:

- Amount.
- Status.
- Reason.
- Description.
- Associated loan.
- Creation/update information.

Fine statuses include unpaid, paid and waived.

## 15.2 Payment

A payment contains:

- Unique reference.
- Amount.
- Payment method.
- Payment status.
- Student/user.
- Associated fine.
- Creation timestamp.

This creates a traceable relationship between a borrowing transaction, an overdue event, the resulting fine and its payment.

---

# 16. Notifications and Activity Tracking

The platform includes a notification model designed to keep users informed of important library events.

Notification types include:

- Due reminders.
- Overdue alerts.
- Booking confirmations.
- Booking cancellations.
- Book availability alerts.
- Fine issued.
- Fine paid.
- General messages.
- System messages.

Notifications also have priorities such as low, normal, high and urgent.

The system also maintains reading history. A history record identifies the action, resource type, resource ID, title, optional author and timestamp. This enables the student experience to include a meaningful record of library activity.

---

# 17. Help Desk and Maintenance Management

The system separates general help-desk reporting from physical maintenance complaint management.

## 17.1 Help Desk

The help-desk subsystem provides a structured mechanism for students to report problems instead of relying on informal communication.

A help-desk ticket includes:

- Subject.
- Description.
- Status.
- Priority.
- Category.
- Creation time.
- Update time.

## 17.2 Maintenance Complaint

Maintenance complaints are designed for physical/facility problems. A complaint includes:

- Title.
- Description.
- Room number.
- Status.
- Student who submitted it.
- Administrator who resolved it, when applicable.
- Resolution time.

The maintenance workflow therefore follows:

```text
Student identifies problem
        |
        v
Describe problem
        |
        v
Submit complaint
        |
        v
Administrator reviews
        |
        +----> In progress
        |
        v
Resolve
        |
        v
Record resolution
```

This provides accountability because the system can identify who submitted a complaint and who resolved it.

---

# 18. Library Policies and System Settings

An important design principle of the system is that library rules should be configurable rather than scattered across the interface.

The `LibrarySetting` model contains operational settings such as:

- Library name.
- Institution.
- Address.
- Phone.
- Email.
- Website.
- Opening hours.
- Maximum books per student.
- Loan duration.
- Renewal limit.
- Fine rate.
- Maximum fine.
- Lost-book threshold.
- Lost-book fee.
- Grace period.
- Email notification setting.
- SMS notification setting.
- Maintenance mode.

This architecture supports a policy-driven system.

For example, the student should not have to memorize the borrowing limit. The system can display the configured rule before a transaction, and the backend can enforce the same rule when the transaction is submitted.

This is particularly important for borrowing and reservation because the user interface and backend should agree on the same policy.

---

# 19. Analytics and AI Forecasting

The system is designed to use library transaction data not only for record keeping but also for decision support.

The project README identifies an AI forecasting capability for predicting book demand through the Python ML service.

Potential analytical questions include:

- Which books are borrowed most frequently?
- Which categories experience the highest demand?
- When does demand increase?
- Which resources may need additional copies?
- Which books have low utilization?
- What circulation trends are developing over time?

The ML service is separated from the transactional backend so predictive workloads do not need to be embedded directly into normal catalogue or circulation operations.

The architecture can therefore evolve from descriptive analytics to predictive analytics without redesigning the entire application.

---

# 20. Security and Access Control

Security is implemented across authentication, authorization and auditing.

## 20.1 Authentication

The backend uses protected routes and authentication middleware. Requests to protected services must be associated with an authenticated user.

## 20.2 Authorization

The backend uses role restrictions for sensitive operations. Administrative operations are protected so that normal student requests cannot perform administrative actions.

## 20.3 Data Validation

Critical operations validate required values before changing persistent data. Examples include validating a student before checkout, validating a physical-copy barcode and verifying that a copy is available before creating a loan.

## 20.4 Audit Logging

Administrative actions can be recorded using the AuditLog model. Audit records can include the action, description, affected entity, user, IP address, user agent, severity and additional details.

Audit logging provides accountability and helps with troubleshooting.

---

# 21. Database Design

The PostgreSQL database is structured around related entities rather than one large transaction table.

## 21.1 Major Relationships

```text
User
 |---- Loan ---- BookCopy ---- Book
 |
 |---- Reservation
 |
 |---- RoomBooking ---- StudyRoom
 |
 |---- Notification
 |
 |---- ReadingHistory
 |
 |---- Payment ---- Fine ---- Loan
 |
 |---- MaintenanceComplaint
 |
 |---- AuditLog
```

## 21.2 Important Entities

### User
Stores identity, account, academic and role information.

### Book
Stores catalogue-level bibliographic information.

### BookCopy
Stores individual physical inventory items.

### Loan
Connects a student to a physical copy for a borrowing period.

### Reservation
Stores resource/space reservation requests and their states.

### StudyRoom
Stores physical study-space information.

### RoomBooking
Stores scheduled study-room bookings.

### Fine
Stores financial penalties associated with loans.

### Payment
Stores settlement information for fines.

### Notification
Stores user-facing system messages.

### ReadingHistory
Stores activity against library resources.

### DigitalResource
Stores managed digital academic resources.

### DigitalLibraryCard
Stores digital library identity information.

### HelpDeskTicket
Stores general library problem reports.

### MaintenanceComplaint
Stores facility/maintenance complaints.

### AuditLog
Stores security and administrative activity records.

### LibrarySetting
Stores configurable library rules and operational settings.

### BackupConfig and BackupLog
Store backup configuration and backup activity records.

---

# 22. API and Backend Design

The backend uses REST-style endpoints organized around resources and operations.

Examples of backend domains include:

- Authentication.
- Users.
- Books.
- Book copies.
- Loans.
- Reservations.
- Digital resources.
- Study rooms.
- Fines.
- Notifications.
- Maintenance.
- Help desk.
- Reports.
- Settings.

The circulation API includes operations for retrieving loan records, identifying overdue loans, checking out books and returning books. The checkout process uses a database transaction to ensure that the loan creation and physical-copy status change remain consistent.

This transactional approach is important. A book should not become `BORROWED` while the loan record fails to exist, and a loan should not exist while the physical copy incorrectly remains `AVAILABLE`.

---

# 23. Frontend Design and User Experience

The frontend is organized into reusable React components and module-level workspaces.

Student-facing modules in the project include catalogue exploration, digital library, digital identity, borrowed books, fines/payments, notifications, library policies, transaction rules, profile settings and help-desk functionality.

Administrative modules are organized into areas such as dashboard, inventory, borrowing, reservations, resources, facilities, fines, maintenance, reports, configuration, audit and user approvals.

The interface uses modern web UI technologies including Tailwind CSS and Framer Motion. The goal is to present complex library operations through focused workspaces rather than exposing database structures directly to the user.

A major UX principle for the platform is progressive disclosure: students see the information needed to make a decision, while administrators receive deeper operational controls.

---

# 24. Important Business Rules

The following rules are central to the platform.

## 24.1 Physical Copy Rule

A catalogue title is not the same thing as a physical copy. Circulation occurs against an individual copy.

## 24.2 Availability Rule

A physical copy must be available before it can be checked out.

## 24.3 Loan Limit Rule

A student's active loans are counted against the configured maximum student loan limit.

## 24.4 Due-Date Rule

Every loan has a due date. The default configured loan duration is fourteen days.

## 24.5 Fine Rule

Overdue transactions can produce fines according to the configured daily rate and maximum fine.

## 24.6 Reservation Rule

Reservation is a separate transaction from borrowing. A reservation has its own status lifecycle.

## 24.7 Notification Rule

Important circulation, reservation, booking and fine events can generate notifications.

## 24.8 Audit Rule

Important administrative actions should be traceable through audit records.

## 24.9 Policy Rule

Library policies should be configurable through system settings instead of being duplicated across multiple interfaces.

---

# 25. End-to-End System Workflows

## 25.1 Student Registration and Access

```text
Student opens system
        |
        v
Registration / Login
        |
        v
Authentication
        |
        v
Student Dashboard
```

## 25.2 Find and Borrow a Book

```text
Student searches catalogue
        |
        v
Select book
        |
        v
View availability
        |
        v
Read borrowing rules
        |
        v
Borrow available copy
        |
        v
Loan created
        |
        v
Copy marked BORROWED
        |
        v
Student sees loan + due date
```

## 25.3 Find and Reserve an Unavailable Book

```text
Student searches catalogue
        |
        v
Book unavailable
        |
        v
View reservation rules
        |
        v
Submit reservation
        |
        v
Reservation = PENDING
        |
        v
Administrator manages queue
        |
        v
Reservation fulfilled / cancelled / expired
```

## 25.4 Return a Book

```text
Active loan
   |
   v
Return request
   |
   v
Loan marked RETURNED
   |
   v
Copy marked AVAILABLE
   |
   +----> Fine calculated if overdue
   |
   v
Reading history updated
```

## 25.5 Study Room Booking

```text
Student views study rooms
        |
        v
Select room
        |
        v
Select date/time
        |
        v
Submit booking
        |
        v
Booking confirmed / rejected / cancelled
```

## 25.6 Digital Resource Access

```text
Student opens Digital Library
        |
        v
Search/filter resource
        |
        v
Open resource details
        |
        v
Access managed URL
        |
        v
Read/download according to resource access rules
```

## 25.7 Report a Library Problem

```text
Student identifies issue
        |
        v
Help Desk
        |
        v
Describe problem
        |
        v
Submit ticket
        |
        v
Administrator reviews
        |
        v
Status updated
```

## 25.8 Report a Maintenance Problem

```text
Student identifies facility problem
        |
        v
Maintenance reporting
        |
        v
Enter description + location
        |
        v
Complaint submitted
        |
        v
Administrator reviews
        |
        v
Issue resolved
```

---

# 26. Error Handling and Data Integrity

A production library system must not only handle successful workflows; it must also prevent invalid state transitions.

Examples include:

- Rejecting checkout when student information is missing.
- Rejecting checkout when the student cannot be found.
- Rejecting checkout when a copy does not exist.
- Rejecting checkout when a copy is not available.
- Rejecting a return for a nonexistent loan.
- Preventing duplicate return processing.
- Handling missing system settings through safe defaults where implemented.
- Validating required digital-resource fields.
- Maintaining database consistency during multi-step circulation operations.

The use of database transactions for checkout and return is especially important because circulation changes more than one entity at a time.

---

# 27. Testing and Quality Assurance

Testing should be performed at several levels.

## 27.1 Functional Testing

Each user-facing workflow should be tested from beginning to end:

- Login.
- Catalogue search.
- Book details.
- Borrowing.
- Return.
- Reservation.
- Digital resource access.
- Study-room booking.
- Help desk reporting.
- Maintenance reporting.
- Notifications.
- Fines.

## 27.2 Administrative Testing

Administrative workflows should include:

- Creating a book.
- Editing a book.
- Adding physical copies.
- Changing copy status where supported.
- Managing loans.
- Managing reservations.
- Creating digital resources.
- Managing rooms.
- Managing fines.
- Updating policies.
- Reviewing maintenance complaints.
- Viewing reports.

## 27.3 Integration Testing

Integration testing verifies that the frontend, backend and database agree on request and response structures.

For example:

```text
Frontend checkout form
        |
        v
POST API request
        |
        v
Backend validation
        |
        v
Prisma transaction
        |
        +---- Loan created
        +---- Copy status updated
        +---- History recorded
        +---- Audit recorded
        |
        v
API response
        |
        v
Frontend refreshes relevant state
```

## 27.4 Production Verification

After deployment, the following should be verified:

- Frontend loads successfully.
- Backend API is reachable.
- Database connection works.
- Authentication works.
- Student workflows work.
- Administrator workflows work.
- No critical console errors occur.
- No critical API 4xx/5xx errors occur during normal use.

---

# 28. Deployment Architecture

The project is designed as separate deployable services.

```text
             Browser / Mobile Web
                     |
                     v
             React/Vite Frontend
                     |
                 HTTPS/API
                     |
                     v
             Node/Express Backend
                     |
             Prisma ORM / PostgreSQL
                     |
                     +----------------+
                                      |
                                      v
                              Python FastAPI ML
```

This separation provides several advantages:

- Frontend and backend can be deployed independently.
- Database access remains behind the backend.
- ML workloads are isolated from transactional API operations.
- Each service can be scaled or maintained independently.

---

# 29. Demonstration and Video Guide

The project video should demonstrate the system as two connected stories rather than as a random collection of screens.

## 29.1 Part One — Student Journey

Recommended order:

1. Open the application.
2. Log in as a student.
3. Show the student dashboard.
4. Open the catalogue.
5. Search for a book.
6. Open the book details.
7. Explain availability.
8. Show borrowing rules before borrowing.
9. Demonstrate borrowing of an available copy.
10. Show the resulting loan and due date.
11. Demonstrate the distinction between borrowing and reservation.
12. Select an unavailable book.
13. Show reservation rules.
14. Create a reservation.
15. Show reservation status.
16. Open Digital Library.
17. Open a digital resource.
18. Show study-room booking.
19. Show notifications.
20. Show fines/history if applicable.
21. Demonstrate reporting a library issue.
22. Demonstrate reporting a maintenance issue.
23. Show the student's profile/digital identity.

## 29.2 Part Two — Administrator Journey

Recommended order:

1. Log in as administrator.
2. Show the administrator dashboard.
3. Show user management/approvals.
4. Open book inventory.
5. Create or edit a book.
6. Explain catalogue information versus physical copies.
7. Add physical copies and demonstrate barcode tracking.
8. Show available/borrowed/reserved/maintenance/lost statuses.
9. Open borrowing management.
10. Show active loans.
11. Show overdue loans and fine calculation.
12. Open reservation management.
13. Show pending and fulfilled reservations.
14. Open Digital Resources.
15. Create/manage a resource.
16. Open facilities/study-room management.
17. Open fines/payment management.
18. Open maintenance management.
19. Demonstrate reviewing/updating a maintenance complaint.
20. Open reports and analytics.
21. Show audit information.
22. Open system settings.
23. Explain that borrowing and reservation policies are controlled centrally.

## 29.3 Strong Demonstration Story

The strongest demonstration is to create a complete cause-and-effect chain:

```text
ADMINISTRATOR
    |
    +--> Adds book
    +--> Adds physical copies
    +--> Configures borrowing policy
    |
    v
STUDENT
    |
    +--> Searches book
    +--> Reads rules
    +--> Borrows available copy
    |
    v
SYSTEM
    |
    +--> Creates loan
    +--> Marks copy borrowed
    +--> Calculates due date
    +--> Records activity
    +--> Sends notification where enabled
    |
    v
ADMINISTRATOR
    |
    +--> Sees active loan
    +--> Monitors overdue status
    +--> Manages return/fine
```

This demonstrates that the system is an integrated platform rather than a set of unrelated pages.

---

# 30. Limitations and Future Enhancements

A professional system document should distinguish the current implementation from future enhancements.

Potential future improvements include:

1. More advanced recommendation algorithms.
2. More sophisticated demand forecasting.
3. Automated reservation notifications and expiry processing.
4. More extensive online payment integration.
5. Barcode/QR scanning through device cameras.
6. Automated inventory audits.
7. Enhanced mobile experience.
8. Advanced dashboard customization.
9. More granular analytics and forecasting.
10. Stronger integration with institutional identity systems.
11. More extensive email/SMS automation.
12. Automated backup execution and monitoring.
13. Expanded digital-resource access controls.

These should be presented as future work rather than being claimed as current functionality unless they are visibly implemented and demonstrable.

---

# 31. Conclusion

The KNUST Library Management System provides a unified digital environment for managing modern university library services. It connects the student experience with the administrative processes required to operate a library effectively.

For students, the platform provides a structured way to discover resources, understand rules, borrow books, make reservations, access digital resources, reserve study spaces, monitor account activity, receive notifications and report problems.

For administrators, it provides centralized control over catalogue data, physical inventory, circulation, reservations, digital resources, study rooms, fines, maintenance, reports, policies and audit information.

The separation of catalogue books from individual physical copies provides a strong foundation for accurate inventory and circulation. The separation of borrowing from reservation makes the student decision process clearer. The configurable policy model allows library rules to be managed centrally. Audit and notification capabilities improve accountability and communication, while the ML service provides a foundation for predictive library analytics.

The system therefore addresses the larger problem of fragmented library operations by bringing resource discovery, circulation, reservation, administration, communication and analytics into one integrated platform.

---

# 32. Appendix A: Major Data Entities

| Entity | Purpose |
|---|---|
| User | Student/admin identity and account information |
| Book | Catalogue-level bibliographic record |
| BookCopy | Individual physical copy and barcode |
| Loan | Physical borrowing transaction |
| Reservation | Book/space reservation request |
| StudyRoom | Study-space definition |
| RoomBooking | Scheduled study-room booking |
| Fine | Overdue or other financial penalty |
| Payment | Payment against a fine |
| Notification | User notification |
| ReadingHistory | Resource activity history |
| DigitalResource | Managed digital academic resource |
| DigitalLibraryCard | Digital library identity |
| HelpDeskTicket | General library issue report |
| MaintenanceComplaint | Physical/facility complaint |
| AuditLog | Security/administrative activity record |
| LibrarySetting | Configurable library rules |
| BackupConfig | Backup configuration |
| BackupLog | Backup activity record |
| EmailTemplate | Configurable email templates |
| DashboardWidget | User dashboard layout/preferences |

---

# 33. Appendix B: Major System Capabilities

## Student Capabilities

- Authentication and account access.
- Dashboard.
- Catalogue exploration.
- Book details and availability.
- Borrowing.
- Returns.
- Reservations.
- Borrowing/reservation rules.
- Digital library.
- Digital identity.
- Study-room bookings.
- Notifications.
- Reading history.
- Fines/payments.
- Help desk.
- Maintenance reporting.
- Profile/settings.

## Administrator Capabilities

- Dashboard.
- User management.
- Pending approvals.
- Catalogue management.
- Physical inventory.
- Book-copy management.
- Borrowing management.
- Reservation management.
- Digital-resource management.
- Study-room/facility management.
- Fine/payment management.
- Maintenance management.
- Reports and analytics.
- Audit logs.
- System configuration.
- Library policy management.
- Backup/configuration management.

---

## Final Documentation Note

This document deliberately uses **Students** and **Administrators** as the two primary user personas for the project demonstration. It does not create separate Staff or Librarian user journeys. Features described as current functionality should be demonstrated through the corresponding application interface; architectural or database capabilities that are not exposed in the UI should be treated as implementation foundations or future work rather than presented as completed user-facing features.
