Endpoints:

- `GET /pingpong` increments the PostgreSQL-backed counter and returns `pong <count>`.
- `GET /pings` returns the current count for the Log Output application.

`manifests/secret.enc.yaml` is encrypted with SOPS and must be decrypted before K8s can use it:

```bash
export SOPS_AGE_KEY_FILE=/path/to/your/age-private-key.txt
sops --decrypt manifests/secret.enc.yaml | kubectl apply -f -
```

Then apply the remaining unencrypted manifests explicitly:

```bash
kubectl apply \
  -f manifests/configmap.yaml \
  -f manifests/postgres-service.yaml \
  -f manifests/postgres-statefulset.yaml \
  -f manifests/service.yaml \
  -f manifests/deployment.yaml
```

This app shares an ingress with log_output app, so you might as well do `kubectl apply -f ../log_output/manifests` and it would still work.

App should be accessible through [http://localhost:8081/pingpong](http://localhost:8081/pingpong). the localhost:8081 port has to be forwarded to port 80 of the k3d loadbalancer inside the cluster.
