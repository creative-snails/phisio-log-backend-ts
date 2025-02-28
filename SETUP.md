## 🚀 Installation & Setup

### 🐳 Recommended: Run with Docker

For a consistent development environment, we **highly recommend using Docker**.

Open a terminal and navigate to the project directory.

Add `MONGO_HOST=mongo` to your .env file.

Run the following commands:

```bash
npm install
docker compose build --no-cache
docker compose up
```

## Notes:

To avoid issues when the host and container environments differ (e.g., different operating systems), we use anonymous volumes for node_modules in development.

This ensures that the node_modules directory is preserved and not overwritten by the host.

If you add or remove dependencies, rebuild the container to ensure the node_modules directory is up-to-date `docker compose up --build` or just `docker compose up`.

Use `docker compose build` only for the initial build.

After that, you can use `docker compose up` directly to start the containers.

To stop the containers, use:

```bash
docker compose down
```
