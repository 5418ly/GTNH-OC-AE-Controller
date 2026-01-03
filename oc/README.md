# OpenComputers Client

Scripts for the in-game OpenComputers machine.

## Files

* `main.lua`: The main entry point. Loops to fetch tasks and report storage.
* `config.lua`: Configuration file. **Must be configured before running.**
* `http-method.lua`: Wrapper for HTTP requests.
* `json.lua`: JSON library.
* `cpu.lua`: CPU information helper.
* `installer.lua`: Helper script to download files (requires internet).

## Setup

1. Assemble a Computer (Tier 3 recommended, with Internet Card, Lua BIOS, max RAM).
2. Install OpenOS.
3. Download these files to the computer (e.g., `/home/oc-ae/`).
4. Edit `config.lua`:
   * Set `baseUrl` to your backend server address (e.g., `http://192.168.1.5:8080`).
   * Set `token` to match your backend configuration.
   * Ensure `path` entries point to `/api/v2/...` endpoints.
5. Run `main`.

## Troubleshooting

* **Not enough memory**: The script now uses chunked uploads to minimize memory usage. If you still crash, try rebooting or reducing the batch size in `main.lua` (`local batchSize = 50`).
* **Connection refused**: Check your `baseUrl` and ensure the backend is running and reachable from the game instance.