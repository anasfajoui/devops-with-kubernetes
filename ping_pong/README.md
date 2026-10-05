## Ping Pong

### Endpoints

- `GET /pingpong` increments the PostgreSQL-backed counter and returns `pong <count>`.
- `GET /pings` returns the current count for the Log Output application.

### Deployment

Create the shared namespace first:

```bash
kubectl apply -f ../log_output/manifests/namespace.yaml
```

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
  -f manifests/deployment.yaml \
  -f manifests/httproute.yaml
```

This app shares a Gateway with Log Output app. Apply its Gateway and route with `kubectl apply -f ../log_output/manifests`.

Wait for PostgreSQL and Ping-pong to start, then find the Gateway address:

```bash
kubectl -n exercises get gateway log-output-ping-pong-gateway --watch
```

The app should be available at `http://<GATEWAY_ADDRESS>/pingpong` once the IP address is assigned.
