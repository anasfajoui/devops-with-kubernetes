## The project

- The form sends new todos (limited to 140 characters) to the Todo Backend service.
- The list of todos is fetched from the Todo Backend service.
- The random image is persistently cached.
- The shutdown buttons exit either the Todo App or Todo Backend process so K8s restarts the selected container. The cached image and PostgreSQL-backed todos persist across application restarts.

### Deployment

The root `kustomization.yaml` combines the Todo App, Todo Backend, PostgreSQL, hourly CronJob, image-cache PVC, and project namespace.

First, you need to decrypted database Secret first:

```sh
export SOPS_AGE_KEY_FILE=/path/to/your/age-private-key.txt
sops --decrypt ../todo_backend/manifests/secret.enc.yaml >../todo_backend/manifests/secret.yaml
```

The Secret is managed separately because Kustomize does not decrypt SOPS files. Then deploy all project resources with Kustomize:

```sh
kubectl apply -k .
```

Find the ingress address:

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
