## Todo Backend

- Each completed request writes one JSON log line to stdout with its timestamp, method, path, HTTP status, and duration. `POST /todos` logs also include the submitted todo, and whether it was accepted, rejected, or failed. Rejected todos include the reason and use the `warn` level.
- The backend enforces `MAX_TODO_LENGTH=140` from the ConfigMap before accessing the database. To submit a 141-character todo through the Gateway, you may use the `requests.http` file.
- A cronjob adds a random Wikipedia todo every hour.
- Another CronJob backs up the todo database to Cloud Storage every day at 00:00 UTC.

### Deployment

The project's Kustomize configuration includes this backend, the Gateway and HTTPRoutes, PostgreSQL, the namespace, the hourly todo CronJob and the daily backup CronJob. See [the project deployment instructions](../the_project/README.md#deployment) to deploy both apps together.

Find the Gateway address:

```sh
kubectl -n project get gateway project-todo-gateway --watch
```

The API should be available at http://<GATEWAY_ADDRESS>/todos once the IP address is assigned.

### Endpoints

- `GET /todos` returns an array of `{ "id": "1", "todo": "Learn Kubernetes", "done": false }` objects.
- `POST /todos` accepts `{ "todo": "Learn Kubernetes" }` and returns the created todo with its ID and `done: false`.
- `PUT /todos/<id>` accepts `{ "done": true }` or `{ "done": false }`, persists the status, and returns the updated todo.
- `POST /todos/shutdown` shuts down the process so Kubernetes can restart the container.
- `GET /todos/healthz` returns 200 when the HTTP server responds, independently of PostgreSQL.
- `GET /todos/readyz` runs a fresh `SELECT 1` query and returns 200 on success or 503 if PostgreSQL is unavailable.
