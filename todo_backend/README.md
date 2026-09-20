## Todo Backend

Endpoints:

- `GET /todos` returns the list of todos as JSON.
- `POST /todos` accepts `{ "todo": "Learn Kubernetes" }` and creates a todo.
- `POST /todos/shutdown` shuts down the process so Kubernetes can restart the container.

The `random-wikipedia-todo` CronJob runs at the start of every hour. It reads the
redirect from Wikipedia's random article endpoint and creates a `Read <URL>`
todo through `POST /todos`.

Deploy with `kubectl apply -f manifests`.
