function siteResources(site) {
  const { name, namespace, uid } = site.metadata
  const url = new URL(site.spec.website_url)
  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('website_url must be an HTTP or HTTPS URL')
  }

  const childName = name.length <= 58 && !name.includes('.') ? `site-${name}` : `dummysite-${uid}`
  const labels = { 'dummysite-uid': uid }
  const metadata = {
    name: childName,
    namespace,
    labels,
    ownerReferences: [{ apiVersion: site.apiVersion, kind: site.kind, name, uid, controller: true }],
  }

  const deployment = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { ...metadata },
    spec: {
      replicas: 1,
      selector: { matchLabels: labels },
      template: {
        metadata: { labels },
        spec: {
          automountServiceAccountToken: false,
          securityContext: { runAsNonRoot: true, runAsUser: 1000, fsGroup: 1000 },
          volumes: [{ name: 'page', emptyDir: {} }],
          initContainers: [{
            name: 'download',
            image: 'curlimages/curl:8.12.1',
            command: ['curl'],
            args: [
              '--fail', '--location', '--silent', '--show-error', '--globoff',
              '--proto', '=http,https', '--proto-redir', '=http,https', '--max-time', '60',
              '--output', '/site/index.html', '--url', '$(WEBSITE_URL)',
            ],
            env: [{ name: 'WEBSITE_URL', value: url.href }],
            volumeMounts: [{ name: 'page', mountPath: '/site' }],
          }],
          containers: [{
            name: 'web',
            image: 'busybox:1.37.0',
            command: ['httpd', '-f', '-p', '8080', '-h', '/site'],
            ports: [{ name: 'http', containerPort: 8080 }],
            volumeMounts: [{ name: 'page', mountPath: '/site', readOnly: true }],
            readinessProbe: { httpGet: { path: '/', port: 'http' } },
          }],
        },
      },
    },
  }

  const service = {
    apiVersion: 'v1',
    kind: 'Service',
    metadata: { ...metadata },
    spec: {
      type: 'ClusterIP',
      selector: labels,
      ports: [{ name: 'http', port: 80, targetPort: 'http' }],
    },
  }
  return [deployment, service]
}

module.exports = { siteResources }
