# OC-AE Controller

Based on GTNH (GregTech New Horizons), this external control system allows remote monitoring and management of Applied Energistics 2 (AE2) networks via a Web interface.

It utilizes OpenComputers (OC) as the bridge between the game and the external network.

## Features

* **Item Search**: Browse all items in your AE network.
* **Fluid/Essentia Monitoring**: View all fluids and Thaumcraft essentia.
* **CPU Management**: Monitor Crafting CPU status and view active crafting jobs.
* **Crafting Requests**: Request item crafting directly from the web interface.
* **Smart Sync**: Optimized data transmission to prevent OpenComputers OOM (Out Of Memory) errors, supporting huge networks with thousands of items.

## Architecture

* **Frontend**: React + Vite + Ant Design.
* **Backend**: Java (Spring Boot 3) + H2 Database (Embedded).
* **OC Script**: Lua scripts running on OpenComputers.

## Installation & Setup

### 1. Backend

The backend now uses an embedded H2 database. No external database setup is required.

1. Navigate to `backend/simple-backend`.
2. Build and run:
   ```bash
   ./gradlew build
   java -jar build/libs/simple-backend-0.0.2-SNAPSHOT.jar
   ```
   (Or use your IDE to run `SimpleBackendApplication`)

### 2. OpenComputers (In-Game)

1. Craft an OpenComputer (Tier 3 recommended) with an Internet Card and an Adapter/Interface connected to your AE network.
2. Install the scripts. You can use the `installer.lua` (requires `wget`) or copy files manually from the `oc/` directory.
   * `config.lua`
   * `main.lua`
   * `http-method.lua`
   * `json.lua`
   * `cpu.lua`
3. **Configuration**: Edit `config.lua` in-game:
   ```lua
   return {
       sleep = 10,
       token = "your_secret_token",
       baseUrl = "http://<your-backend-ip>:8080",
       path = {
           task = "/task",
           cpu = "/api/v2/cpus",
           essentia = "/api/v2/essentia",
           fluids = "/api/v2/fluids",
           items = "/api/v2/items"
       }
   }
   ```
   *Note: The paths must point to the new V2 API endpoints as shown above.*

4. Run `main` to start the client.

### 3. Frontend

1. Navigate to `front/`.
2. Install dependencies: `npm install`.
3. Build or run dev server:
   ```bash
   npm run dev
   # or
   npm run build
   ```
4. Open the web page. Go to **Config** page to set your Backend URL and Token.

## Recent Updates

* **OOM Fix**: Implemented chunked data upload. The OC script now sends data in small batches to prevent memory overflow in large networks.
* **Database Migration**: Moved from file-based JSON storage to H2 Database for better performance and reliability.
* **V2 API**: New REST API endpoints supporting batch operations and pagination.
* **CPU Flickering Fix**: Improved CPU status synchronization to prevent detailed information from disappearing during updates.