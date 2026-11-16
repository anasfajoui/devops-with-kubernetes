# Monitoring

This PromQL query shows the number of Pods created by StatefulSets in the `prometheus` namespace:

```promql
sum(kube_pod_info{namespace="prometheus", created_by_kind="StatefulSet"})
```

`namespace` selects the namespace, and `created_by_kind` selects Pods owned by StatefulSets. Each matching `kube_pod_info` metric has a value of 1, so `sum` gives the total number of Pods.

## NATS metrics

The official NATS Helm chart runs the shared broker as `my-nats-0` in the `nats` namespace, with its Prometheus exporter enabled. `prom-values.yaml` adds a static `nats` scrape job targeting `my-nats-0.my-nats-headless.nats.svc.cluster.local:7777`.

- The Grafana values provision a **NATS Overview** dashboard in the **NATS** folder and shows:
    + Scrape availability
    + Active connections
    + Message throughput
    + Byte throughput

After the workflow deploys monitoring and the applications, run:

```sh
kubectl port-forward --namespace monitoring svc/grafana 3000:80
```

Open [NATS Overview](http://localhost:3000/d/nats-overview) and log in with `admin` / `admin`. The throughput graphs need at least two Prometheus scrapes; creating or updating a todo generates traffic.

