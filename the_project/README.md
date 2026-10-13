## The Project

- The form sends new todos (limited to 140 characters) to the Todo Backend service.
- The list of todos is fetched from the Todo Backend service.
- The random image is persistently cached.
- The shutdown buttons exit either the Todo App or Todo Backend process so K8s restarts the selected container. The cached image and PostgreSQL-backed todos persist across application restarts.

### Deployment

The [Release application workflow](../.github/workflows/main.yml) creates the cluster, builds and publishes The Project Docker images to Google Artifact Registry, and deploys the app, backend, PostgreSQL, and hourly CronJob to GKE. It runs when either service changes and can also be started manually.

Wait for the workflow to finish, then find the ingress address:

```sh
kubectl -n project get ingress --watch
```

The app should be available at http://<INGRESS_ADDRESS>/ once the IP address is assigned.

### Endpoints

- `GET /` — displays the todo application.
- `GET /image` — serves the persistently cached Lorem Picsum image.
- `POST /shutdown` — shuts down the Node process so Kubernetes can restart the container.

- `GET /todos` returns the list of todos as JSON.
- `POST /todos` accepts `{ "todo": "Learn Kubernetes" }` and creates a todo.
- `POST /todos/shutdown` shuts down the process so Kubernetes can restart the container.
