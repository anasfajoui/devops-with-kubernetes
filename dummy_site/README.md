# DummySite CRD

A `DummySite` tells K8s to serve a copy of the HTML at `spec.website_url` ([example](example.yaml)).
    - The controller watches all namespaces and creates a Deployment and a ClusterIP Service in each site's namespace.
    - In the Deployment, a curl init container follows redirects and writes the page to a shared volume. BusyBox then serves that file.separately.
    - The ClusterRoleBinding lets that account watch DummySites and manage their Deployments and Services in every namespace.
    - The Kustomization packages the controller source in a ConfigMap, so we can use the stock Node.js image without building or publishing an image.

## Install the controller

From the repository root, install the controller in the `default` namespace.

```sh
kubectl apply -k dummy_site
kubectl -n default rollout status deployment/dummysite-controller --timeout=3m
```

## The example

The sample [DummySite](example.yaml) is named `example` and points to `https://example.com/`. Select any existing namespace in your kubectl context and run the following commands there.

```sh
kubectl apply -f dummy_site/example.yaml
kubectl rollout status deployment/site-example --timeout=3m
kubectl port-forward service/site-example 8080:80
```

Open [localhost:8080](http://localhost:8080/) to see the page.

To copy a different page, change `spec.website_url` and reapply the sample. The Deployment rolls out a new pod that downloads the new URL. To remove the copy, run `kubectl delete -f dummy_site/example.yaml`. Kubernetes removes the owned Deployment and Service along with the DummySite.
