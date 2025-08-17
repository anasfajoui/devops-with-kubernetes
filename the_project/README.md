## The project: Step 3

Deploy with `kubectl apply -f https://raw.githubusercontent.com/anasfajoui/devops-with-kubernetes/1.5/the_project/manifests/deployment.yaml`.

Then port forward with `kubectl port-forward <project-dep-xxx-xxx> 3003:3000`.

App should be accessible through [http://localhost:3003/](http://localhost:3003/).
