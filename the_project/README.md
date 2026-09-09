## The project

The application now includes:
- A todo input limited to 140 characters.
- A form that sends new todos to the Todo Backend service.
- A list of todos fetched from the Todo Backend service.
- A persistently cached random image.

Deploy the persistent volume resources first, then the application:

```sh
kubectl apply -f ../persistent_volume/manifests
kubectl apply -f ../todo_backend/manifests
kubectl apply -f manifests
```

The shutdown buttons exit either the Todo App or Todo Backend process so
Kubernetes restarts the selected container. The cached image remains available
after a Todo App restart, while the in-memory todos reset after a Todo Backend
restart.

App should be accessible through [http://localhost:8081/](http://localhost:8081/):

- `GET /` — displays the todo application.
- `GET /image` — serves the persistently cached Lorem Picsum image.
- `POST /shutdown` — shuts down the Node process so Kubernetes can restart the container.

- `GET /todos` returns the list of todos as JSON.
- `POST /todos` accepts `{ "todo": "Learn Kubernetes" }` and creates a todo.
- `POST /todos/shutdown` shuts down the process so Kubernetes can restart the container.