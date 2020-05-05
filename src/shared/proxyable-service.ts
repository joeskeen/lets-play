export abstract class ProxyableService {
  private endpoint: string;
  private corsProxy: string;

  constructor(endpoint: string, corsProxy: string) {
      this.endpoint = this.normalizeUrl(endpoint);
      this.corsProxy = this.normalizeUrl(corsProxy);
      console.log(endpoint, corsProxy);
  }

  protected getUrl(path?: string): string {
    path = (path || '').replace(/^\//, '');
    return [this.corsProxy, this.endpoint, path].join('');
  }

  protected normalizeUrl(url: string) {
    if (!url) {
      return '';
    }
    return url.replace(/\/?$/, '/');
  }
}
