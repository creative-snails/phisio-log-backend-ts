## If mongoose fails to connect to mongodb server due to missing db directory

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
