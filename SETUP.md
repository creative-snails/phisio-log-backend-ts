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

### ⚠️ If mongoose fails to connect to mongodb server due to missing db directory

### For Mac users

1 - Create a directory in your home folder:

```bash
mkdir -p ~/data/db
```

2 - Start MongoDB using this custom path:

```bash
mongod --dbpath ~/data/db
```

This is actually a better practice for development environments anyway, as it keeps your database files in your user space and doesn't require root privileges.

If you want to make this permanent, after running the script in step 1, you can:

2 - Create a MongoDB configuration file:

```bash
echo "storage:
dbPath: $(echo $HOME)/data/db" > ~/mongodb.conf
```

3 - Then start MongoDB using this config:

```bash
mongod --config ~/mongodb.conf
```

This should work reliably even after system restarts, and it's a more secure approach since it doesn't require modifying system directories.

---

If {"exitCode":48} it means that MongoDB is already running on the default port (27017).
