## Todo Backend

Endpoints:

- `GET /todos` returns the list of todos as JSON.
- `POST /todos` accepts `{ "todo": "Learn Kubernetes" }` and creates a todo.
- `POST /todos/shutdown` shuts down the process so Kubernetes can restart the container.

Deploy with `kubectl apply -f manifests`.

### Logging

Each completed request writes one JSON log line to stdout with its timestamp, method, path, HTTP status, and duration. `POST /todos` logs also include the submitted todo, its trimmed length, and whether it was accepted, rejected, or failed. Rejected todos include the reason and use the `warn` level.

The backend enforces `MAX_TODO_LENGTH=140` from the ConfigMap before accessing the database. To submit a 141-character todo through the ingress, you may use the `requests.http` file.
