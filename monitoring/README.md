# Monitoring

This PromQL query shows the number of Pods created by StatefulSets in the `prometheus` namespace:

```promql
sum(kube_pod_info{namespace="prometheus", created_by_kind="StatefulSet"})
```

`namespace` selects the namespace, and `created_by_kind` selects Pods owned by StatefulSets. Each matching `kube_pod_info` metric has a value of 1, so `sum` gives the total number of Pods.
