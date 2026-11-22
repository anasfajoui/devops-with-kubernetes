## Todo Broadcaster

Events have this shape:

```json
{
  "eventId": "123e4567-e89b-42d3-a456-426614174000",
  "type": "todo.updated",
  "timestamp": "2026-11-13T12:00:00.000Z",
  "todo": { "id": "1", "todo": "Learn Kubernetes", "done": true }
}
```

Both `todo.created` and `todo.updated` are supported.

In staging, `BROADCASTER_MODE=log` writes each received NATS message and its subject to stdout. In production, the default `discord` mode sends todo events to `DISCORD_WEBHOOK_URL` and uses `WEBHOOK_TIMEOUT_MS` for the request timeout.

### Endpoints

- `GET /healthz` returns 200 when the HTTP server responds, independently of NATS.
- `GET /readyz` returns 200 when connected to NATS with the subscription registered, otherwise 503.

To use [requests.http](requests.http), forward a broadcaster Pod's port:

```sh
kubectl -n <staging/production> port-forward deployment/broadcaster-dep 8080:8080
```

On shutdown, the process stops accepting NATS messages and drains work for up to ten seconds.
