## Connecting pods

- The reader fetches the current pong count from the Ping Pong application's `GET /pings` endpoint through the `ping-pong-svc` K8s Service.
- The writer and reader containers only share their generated log through an `emptyDir` volume inside the Log Output pod.
- The `log-output-config` ConfigMap provides `/config/information.txt` as a mounted file and `MESSAGE` as an environment variable.

Endpoints:

- `GET /` returns the configured file and environment values, latest timestamped log output, and pong count fetched from the Ping Pong application.

Deploy with `kubectl apply -f manifests`.

This app shares an ingress with ping_pong app, so you might as well do `kubectl apply -f ../ping_pong/manifests` and it would still work.

App should be accessible through [http://localhost:8081/](http://localhost:8081/). the localhost:8081 port has to be forwarded to port 80 of the k3d loadbalancer inside the cluster.
