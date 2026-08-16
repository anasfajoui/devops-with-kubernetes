## The project, step 6

Deploy the persistent volume resources first, then the application:

```sh
kubectl apply -f ../persistent_volume/manifests
kubectl apply -f manifests
```

The **Shut down container** button exits the Node process so Kubernetes restarts the container. The cached image remains available after the restart.

App should be accessible through [http://localhost:8081/](http://localhost:8081/).
