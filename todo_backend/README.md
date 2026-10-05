## Todo Backend

- Each completed request writes one JSON log line to stdout with its timestamp, method, path, HTTP status, and duration. `POST /todos` logs also include the submitted todo, and whether it was accepted, rejected, or failed. Rejected todos include the reason and use the `warn` level.
- The backend enforces `MAX_TODO_LENGTH=140` from the ConfigMap before accessing the database. To submit a 141-character todo through the ingress, you may use the `requests.http` file.
- The cronjob adds a random Wikipedia todo every hour.

### Deployment

The project's Kustomize configuration includes this backend, ingress, PostgreSQL, the namespace, and the hourly CronJob.

First, you need to decrypted database Secret first:

```sh
export SOPS_AGE_KEY_FILE=/path/to/your/age-private-key.txt
sops --decrypt manifests/secret.enc.yaml >manifests/secret.yaml
```

You'll also need to apply the shared namespace and ingress (if you want to access the app):

```sh
kubectl apply -f ../the_project/manifests/namespace.yaml
kubectl apply -f ../the_project/manifests/ingress.yaml
```

Finally:

```sh
kubectl apply -k .
```

Find the ingress address:

```sh
kubectl -n project get ingress --watch
```

The app should be available at http://<INGRESS_ADDRESS>/ once the IP address is assigned.

### Endpoints

- `GET /todos` returns the list of todos as JSON.
- `POST /todos` accepts `{ "todo": "Learn Kubernetes" }` and creates a todo.
- `POST /todos/shutdown` shuts down the process so Kubernetes can restart the container.
