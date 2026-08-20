## The project, step 7

The application now includes:
- A todo input limited to 140 characters.
- A Send button (does nothing for now).
- A list of hardcoded todos.

Deploy the persistent volume resources first, then the application:

```sh
kubectl apply -f ../persistent_volume/manifests
kubectl apply -f manifests
```

The **Shut down container** button exits the Node process so Kubernetes restarts the container. The cached image remains available after the restart.

App should be accessible through [http://localhost:8081/](http://localhost:8081/):
- `GET /` — displays the todo application.
- `GET /image` — serves the persistently cached Lorem Picsum image.
- `POST /shutdown` — shuts down the Node process so Kubernetes can restart the container.