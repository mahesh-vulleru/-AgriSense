# AgriSense – Full Stack Foundation Architecture

## Architecture Overview

AgriSense is designed as a decoupled, multi-tier web platform for smart agriculture and IoT field monitoring.

```
+-----------------------------------------------------------+
|               AgriSense Client (React 19 + Vite)          |
|  - Tailwind CSS v4 Theme System                           |
|  - Responsive Layout (Sidebar, TopNav, AppLayout)         |
|  - Reusable UI Component Library (Button, Card, Badge...) |
|  - Live Health State Provider (Context & Hook)            |
|  - Recharts Field Telemetry Visualizer                    |
+-----------------------------+-----------------------------+
                              |
                              | HTTP REST Calls (Axios)
                              | Base URL: VITE_API_URL
                              v
+-----------------------------------------------------------+
|               AgriSense Server (Node.js + Express)        |
|  - Express Application Architecture                       |
|  - CORS & Morgan Request Logging                          |
|  - Centralized Error & Not-Found Handlers                 |
|  - Modular Health Routes & Controller                     |
|  - Robust Windows DNS SRV Support for Atlas               |
+-----------------------------+-----------------------------+
                              |
                              | Mongoose ODM (db: agrisense)
                              v
+-----------------------------------------------------------+
|               MongoDB Database Layer                      |
|  - Local mongod / MongoDB Atlas Cluster                   |
|  - Graceful Connection Fallback                           |
+-----------------------------------------------------------+
```

## Endpoints

### Health Check
- **Route:** `GET /api/health`
- **Description:** Verifies server responsiveness and database connectivity state.
- **Sample Output:**
```json
{
  "success": true,
  "message": "AgriSense API is running",
  "environment": "development",
  "timestamp": "2026-11-05T09:56:10.156Z",
  "uptime": 3,
  "database": {
    "status": "connected",
    "name": "agrisense",
    "host": "ac-yk3uhct-shard-00-00.njvrx3s.mongodb.net"
  }
}
```

