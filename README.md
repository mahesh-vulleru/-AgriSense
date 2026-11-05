# AgriSense 🌱

> **AgriSense** is an intelligent IoT and AI-driven precision agriculture platform designed to empower farmers and agricultural stakeholders with real-time environmental monitoring, smart crop management, predictive analytics, and automated advisory systems.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Getting Started](#-getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation & Setup](#installation--setup)
- [Development Roadmap](#-development-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌾 Overview

Modern agriculture faces significant challenges including water scarcity, unpredictable climate shifts, soil degradation, and resource inefficiencies. **AgriSense** bridges the gap between traditional farming and modern precision agriculture by aggregating data from on-field IoT sensors (soil moisture, temperature, humidity, pH, NPK levels) and processing it through an intelligent web application to deliver actionable insights, automated irrigation schedules, and crop disease advisories.

---

## ✨ Key Features

- **Real-Time Telemetry & Sensor Monitoring:** Live streaming of soil moisture, ambient temperature, relative humidity, light intensity, and nutrient levels.
- **Precision Irrigation Advisory:** Dynamic watering recommendations based on crop water requirements and real-time soil condition metrics.
- **Nutrient & Soil Health Management:** Analysis of soil pH and NPK profiles with tailored fertilization guidance.
- **Disease & Pest Early Warning System:** Timely alerts and predictive risk indicators to minimize crop loss.
- **Interactive Analytics Dashboard:** Intuitive charts, historical trend tracking, and multi-field comparative views.
- **Role-Based Access Control (RBAC):** Customized portals and permissions for farm owners, field workers, agronomists, and system administrators.

---

## 🏗️ System Architecture

```text
  +-------------------------------------------------------------+
  |                   IoT Sensors & Field Nodes                 |
  |     (ESP32 / Arduino / Soil & Environmental Sensors)        |
  +------------------------------+------------------------------+
                                 | HTTP / MQTT / WebSockets
                                 v
  +-------------------------------------------------------------+
  |                     Backend Service                         |
  |            Node.js + Express REST API & Realtime            |
  +------------------------------+------------------------------+
         |                       |                       |
         v                       v                       v
  +--------------+       +---------------+       +---------------+
  |   MongoDB    |       | Analytics &   |       | Notification  |
  | (Mongoose)   |       | Rules Engine  |       | Engine/Alerts |
  +--------------+       +---------------+       +---------------+
                                 ^
                                 | RESTful API / JSON
                                 v
  +-------------------------------------------------------------+
  |                     Frontend Client                         |
  |             React.js Dashboard & Visualizations             |
  +-------------------------------------------------------------+
```

---

## 💻 Tech Stack

### Frontend (`client/`)
- **Framework:** React.js
- **Styling:** Tailwind CSS / CSS Modules
- **State Management & Routing:** React Router / Context API
- **Data Visualization:** Chart.js / Recharts
- **HTTP Client:** Axios

### Backend (`server/`)
- **Runtime:** Node.js
- **Framework:** Express.js
- **Database ODM:** Mongoose
- **Authentication:** JSON Web Tokens (JWT) & bcrypt
- **Communication Protocols:** REST API, WebSockets / MQTT

### Database
- **Database:** MongoDB (Local or MongoDB Atlas)

### Tooling & DevOps
- **Version Control:** Git & GitHub
- **API Testing:** Postman / Thunder Client

---

## 📁 Project Structure

```text
AgriSense/
├── client/              # React frontend application
├── server/              # Node.js and Express backend API
├── docs/                # Project documentation, architecture diagrams, and API specs
├── .gitignore           # Git ignore file for React, Node.js, MongoDB, and environments
└── README.md            # Master project documentation
```

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js** (v18.x or later recommended)
- **npm** (v9.x or later) or **yarn**
- **MongoDB** (Local instance running on `mongodb://localhost:27017` or a MongoDB Atlas connection string)
- **Git**

### Environment Variables

Before launching the application, configure your environment files:

#### Server (`server/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/agrisense
JWT_SECRET=your_super_secret_jwt_key
CORS_ORIGIN=http://localhost:3000
```

#### Client (`client/.env`):
```env
REACT_APP_API_BASE_URL=http://localhost:5000/api
```

### Installation & Setup

> *Note: Application dependencies and scripts will be configured in subsequent development phases.*

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd AgriSense
   ```

2. **Backend Setup:**
   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Frontend Setup:**
   ```bash
   cd ../client
   npm install
   npm start
   ```

---

## 🗺️ Development Roadmap

- [x] **Step 1:** Initialize repository structure, setup documentation, and configure Git environment.
- [x] **Step 2:** Full-stack foundation setup (Express backend, MongoDB connection, React 19 frontend shell, and live health verification).
- [ ] **Step 3:** Authentication & User Management (JWT & Role-based Access).
- [ ] **Step 5:** Build IoT sensor data ingestion pipelines and telemetry endpoints.
- [ ] **Step 6:** Design and implement the sensor analytics dashboard and visual charts.
- [ ] **Step 7:** Develop intelligent alerts, thresholds, and automated notifications.
- [ ] **Step 8:** End-to-end testing, documentation finalization, and deployment.

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:
1. Fork the project repository.
2. Create your feature branch (`git checkout -b feature/NewFeature`).
3. Commit your changes (`git commit -m "feat: add NewFeature"`).
4. Push to the branch (`git push origin feature/NewFeature`).
5. Open a Pull Request.

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

