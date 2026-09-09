## Todo Backend

The Todo Backend stores todos in memory for the duration of the container's life.

Endpoints:

- `GET /todos` returns the list of todos as JSON.
- `POST /todos` accepts `{ "todo": "Learn Kubernetes" }` and creates a todo.
- `POST /todos/shutdown` shuts down the process so Kubernetes can restart the container.

Deploy with `kubectl apply -f manifests`.
