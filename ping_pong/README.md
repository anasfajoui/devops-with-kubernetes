## Connecting pods: Ping Pong application

Endpoints:

- `GET /pingpong` increments the in-memory counter and returns `pong <count>`.
- `GET /pings` returns the current count for the Log Output application.

Deploy with `kubectl apply -f manifests`.

This app shares an ingress with log_output app, so you might as well do `kubectl apply -f ../log_output/manifests` and it would still work.

App should be accessible through [http://localhost:8081/pingpong](http://localhost:8081/pingpong). the localhost:8081 port has to be forwarded to port 80 of the k3d loadbalancer inside the cluster.
