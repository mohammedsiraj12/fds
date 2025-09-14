# 🏥 MedConsult - Advanced Doctor Consultation Platform

A comprehensive telemedicine platform connecting patients with qualified doctors through secure online consultations.

## 🚀 Features

### **For Patients**
- 🩺 **Medical Consultations** with severity levels and categories
- 💊 **Prescription Management** with medication tracking
- 📊 **Health Metrics Tracking** (BMI, blood pressure, heart rate)
- 🔍 **Advanced Doctor Search** with specialization filters
- ⭐ **Review & Rating System** for doctors
- 📅 **Appointment Scheduling** with availability checking
- 📄 **Medical Records Upload** (PDF files)
- 🔔 **Real-time Notifications** via WebSocket
- 👤 **Enhanced Profile Management**

### **For Doctors**
- 💬 **Consultation Management** with response system
- 📝 **Prescription Creation** with detailed medication forms
- 👥 **Patient Management** and history access
- 📈 **Performance Analytics** and metrics
- ⭐ **Review Response** capabilities
- 📅 **Schedule Management** and availability
- 🏥 **Professional Profile** with specializations
- 🔔 **Real-time Patient Notifications**

### **For Administrators**
- 👥 **User Management** with account controls
- 📊 **System Analytics** and reporting
- 🔍 **Audit Logging** with detailed tracking
- 🖥️ **System Health Monitoring**
- ⚙️ **Platform Configuration**
- 📈 **Usage Statistics** and trends

## 🛠️ Technology Stack

### **Backend**
- **FastAPI** - Modern Python web framework
- **Neo4j AuraDB** - Graph database for medical relationships
- **JWT Authentication** - Secure token-based auth
- **WebSocket** - Real-time notifications
- **Pydantic** - Data validation and serialization
- **Uvicorn** - ASGI server

### **Frontend**
- **Next.js 14** - React framework with App Router
- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client for API calls
- **React Hook Form** - Form management
- **Socket.io** - Real-time communication
- **Heroicons** - Beautiful SVG icons

### **Database Schema**
- **Users** - Authentication and roles
- **Patients** - Patient profiles and health data
- **Doctors** - Doctor profiles and specializations  
- **Consultations** - Medical consultations and responses
- **Appointments** - Scheduling and availability
- **Prescriptions** - Medication management
- **Reviews** - Doctor ratings and feedback
- **Notifications** - Real-time messaging
- **MedicalHistory** - Health records and timeline
- **HealthMetrics** - Vital signs and measurements

## 🚀 Quick Start

### **Prerequisites**
- Python 3.9+
- Node.js 18+
- Neo4j AuraDB account

### **Backend Setup**
```bash
cd doctor-consultation-app/api

# Install dependencies
pip install -r requirements.txt

# Configure Neo4j credentials in config/settings.py
# NEO4J_URI = "neo4j+s://your-instance.databases.neo4j.io"
# NEO4J_USER = "your-username"
# NEO4J_PASSWORD = "your-password"

# Start the server
python main.py
```

### **Frontend Setup**
```bash
cd doctor-consultation-app/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### **Database Setup**
1. Create Neo4j AuraDB instance
2. Update `api/config/settings.py` with your credentials
3. Run these Cypher commands in Neo4j Browser:

```cypher
// Create indexes
CREATE INDEX user_email IF NOT EXISTS FOR (u:User) ON (u.email);
CREATE INDEX user_id IF NOT EXISTS FOR (u:User) ON (u.id);
CREATE INDEX consultation_id IF NOT EXISTS FOR (c:Consultation) ON (c.id);
CREATE INDEX appointment_id IF NOT EXISTS FOR (a:Appointment) ON (a.id);

// Create sample admin user
CREATE (admin:User {
    id: 'admin-001',
    email: 'admin@medconsult.com',
    password: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeVMst5/KBpo7aOyO',
    role: 'admin',
    created_at: datetime()
});
```

## 📖 API Documentation

The API documentation is available at: `http://localhost:8002/docs`

### **Main Endpoints**

#### **Authentication**
- `POST /auth/signup` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

#### **Consultations**
- `POST /consultations/create` - Create consultation
- `GET /consultations/my-consultations` - Get user's consultations
- `GET /consultations/available` - Available consultations for doctors
- `PUT /consultations/{id}/respond` - Doctor responds to consultation

#### **Prescriptions**
- `POST /prescriptions/create` - Create prescription
- `GET /prescriptions/my-prescriptions` - Get user's prescriptions
- `PUT /prescriptions/{id}` - Update prescription

#### **Appointments**
- `POST /appointments/book` - Book appointment
- `GET /appointments/my-appointments` - Get user's appointments
- `GET /appointments/doctor/{id}/availability` - Check doctor availability

#### **Profiles**
- `GET /profiles/my-profile` - Get user profile
- `PUT /profiles/patient/update` - Update patient profile
- `PUT /profiles/doctor/update` - Update doctor profile

#### **Reviews**
- `POST /reviews/create` - Create doctor review
- `GET /reviews/doctor/{id}` - Get doctor reviews
- `POST /reviews/{id}/respond` - Doctor responds to review

#### **Search**
- `POST /search/global` - Global platform search
- `GET /search/doctors/advanced` - Advanced doctor search
- `GET /search/suggestions/doctors` - AI-powered doctor suggestions

#### **Files**
- `POST /files/upload` - Upload medical records
- `GET /files/user/{id}` - Get user's files
- `DELETE /files/{id}` - Delete file

#### **Notifications**
- `WebSocket /notifications/ws/{user_id}` - Real-time notifications
- `GET /notifications/my-notifications` - Get notifications
- `PUT /notifications/{id}/read` - Mark as read

#### **Admin**
- `GET /admin/dashboard/analytics` - System analytics
- `GET /admin/users` - User management
- `GET /admin/reports/daily` - Daily reports

## 🔐 Security Features

- **JWT Token Authentication** with secure storage
- **Role-based Access Control** (Patient, Doctor, Admin)
- **Password Hashing** with bcrypt
- **File Upload Validation** with type checking
- **Input Sanitization** and validation
- **CORS Protection** for frontend access

## 🌟 Advanced Features

### **Real-time Communication**
- WebSocket connections for instant notifications
- Live consultation updates
- Real-time appointment confirmations

### **AI-powered Suggestions**
- Doctor recommendations based on symptoms
- Specialization matching
- Historical consultation analysis

### **Health Analytics**
- BMI calculation and tracking
- Health metrics visualization
- Medical history timeline
- Prescription adherence tracking

### **Professional Tools**
- Comprehensive prescription management
- Medical record organization
- Patient progress tracking
- Performance analytics for doctors

## 🎯 User Journeys

### **Patient Journey**
1. **Sign up** and create profile
2. **Search doctors** by specialization/location
3. **Ask medical questions** with symptom details
4. **Book appointments** with preferred doctors
5. **Track health metrics** and upload records
6. **Receive prescriptions** and manage medications
7. **Rate and review** doctors after consultations

### **Doctor Journey**
1. **Sign up** and create professional profile
2. **Review available consultations** from patients
3. **Respond with diagnosis** and treatment plans
4. **Create prescriptions** with detailed medications
5. **Manage appointment schedule** and availability
6. **Track performance metrics** and patient satisfaction
7. **Respond to reviews** professionally

### **Admin Journey**
1. **Monitor system health** and performance
2. **Manage user accounts** and permissions
3. **Review platform analytics** and trends
4. **Export data** for business intelligence
5. **Configure system settings** and policies

## 🚀 Deployment

### **Environment Variables**
Create `.env` file in the API directory:
```env
NEO4J_URI=neo4j+s://your-instance.databases.neo4j.io
NEO4J_USER=your-username
NEO4J_PASSWORD=your-password
SECRET_KEY=your-super-secret-jwt-key
FRONTEND_URL=http://localhost:3000
```

### **Production Deployment**
1. **Backend**: Deploy to cloud platform (AWS, GCP, Heroku)
2. **Frontend**: Deploy to Vercel or Netlify
3. **Database**: Use Neo4j AuraDB (already cloud-ready)
4. **Storage**: Configure cloud storage for file uploads

## 📱 Access Your Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8002
- **API Documentation**: http://localhost:8002/docs
- **Neo4j Browser**: https://browser.neo4j.io

## 🎉 Demo Accounts

**Admin Access:**
- Email: `admin@medconsult.com`
- Password: `password123`

**Create your own doctor and patient accounts through the signup process!**

## 🔧 Development

### **Adding New Features**
1. **Backend**: Add new routers in `api/routers/`
2. **Frontend**: Add new components in `frontend/components/`
3. **Database**: Update schema with new Cypher queries

### **Running Tests**
```bash
# Backend
cd api && python -m pytest

# Frontend  
cd frontend && npm test
```

## 📞 Support

For support and questions, please check the API documentation at `/docs` or review the code structure in the respective directories.

---

**🎉 Your advanced doctor consultation platform is ready for production use with comprehensive features for patients, doctors, and administrators!**
