# AgriSense – Phase 4: Farm Management Module

## Overview

The Farm Management module enables farmers and agricultural stakeholders to register, manage, monitor, edit, and archive their farm plots, soil attributes, and irrigation infrastructure.

---

## 1. Mongoose Farm Model (`server/src/models/Farm.js`)

| Field | Type | Required | Description |
|---|---|---|---|
| `owner` | `ObjectId` (ref: `User`) | Yes | References the authenticated owner. |
| `name` | `String` | Yes | Name of the farm (2–120 characters). |
| `location` | `String` | Yes | Primary address / region. |
| `state` | `String` | No | State identifier. |
| `district` | `String` | No | District identifier. |
| `village` | `String` | No | Village / local parcel name. |
| `pincode` | `String` | No | Postal code. |
| `coordinates` | `{ latitude, longitude }` | No | GPS latitude/longitude. |
| `acreage` | `Number` | Yes | Surface area in acres (> 0). |
| `soilType` | `String` (enum) | Yes | Alluvial, Black, Red, Laterite, Sandy, Clay, Loamy, Other. |
| `irrigationType`| `String` (enum) | Yes | Drip, Sprinkler, Flood, Rain-fed, Other. |
| `mainCrops` | `[String]` | No | Cultivated crops array. |
| `description` | `String` | No | Agronomic notes & topography details. |
| `status` | `String` (enum) | Yes | `Active`, `Inactive`, `Archived`. |
| `timestamps` | `Date` | Auto | `createdAt`, `updatedAt`. |

---

## 2. API Endpoints

All endpoints require JWT Bearer authentication (`Authorization: Bearer <token>`).

| Method | Endpoint | Description | IDOR Protection |
|---|---|---|---|
| `POST` | `/api/farms` | Register a new farm | Auto-assigned to authenticated user (`owner = req.user._id`). |
| `GET` | `/api/farms` | List user's farms + KPI summary | Strict owner scope (`{ owner: req.user._id }`). |
| `GET` | `/api/farms/:id` | Fetch detailed farm info | Verified owner or Admin role required (403 if unauthorized). |
| `PUT` | `/api/farms/:id` | Update farm details | Verified owner or Admin role required (403 if unauthorized). |
| `PATCH` | `/api/farms/:id/archive`| Soft archive/restore farm | Verified owner or Admin role required (403 if unauthorized). |

---

## 3. Frontend Architecture

- **`MyFarmsPage.jsx` (`/dashboard/farms`):**
  - KPI Summary Banner: Total Farms, Total Cultivated Acreage, Active Farms.
  - Toolbar: Search by name/location/crops, status filter, sort dropdown, and Grid/List view toggle.
  - Cards & Rows with acreage, soil classification, irrigation type, and main crop chips.
- **`AddFarmPage.jsx` (`/dashboard/farms/new`):**
  - Complete farm creation form with crop multi-selector, coordinates, and live validation.
- **`FarmDetailsPage.jsx` (`/dashboard/farms/:id`):**
  - Comprehensive overview, geographic address breakdown, crop portfolio, and roadmap tabs (Crops, Soil Analysis, Irrigation, Weather).
  - Modal-based soft archival workflow.
- **`EditFarmPage.jsx` (`/dashboard/farms/:id/edit`):**
  - Full edit interface updating MongoDB records.

---

## 4. Security & Data Integrity

1. **Insecure Direct Object Reference (IDOR) Protection:**
   - Both `GET /:id`, `PUT /:id`, and `PATCH /:id/archive` check that the requesting user matches `farm.owner.toString()` or has `admin` privileges. Other users are rejected with `403 Forbidden`.
2. **Soft Deletion / Archival:**
   - Farms are never hard-deleted without explicit permission. Archival changes `status = 'Archived'`, preserving historical records.
3. **Server-Side Validation:**
   - Non-positive acreage, empty farm names, and invalid soil/irrigation types are rejected on the backend with `400 Bad Request`.

