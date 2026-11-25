import { environment } from '../../../environments/environment';

export function getExternoApiBase(): string {
  if (environment.useRelativeApiProxy && environment.externoApiBase) {
    return environment.externoApiBase;
  }
  return typeof window !== 'undefined' && window.location?.hostname
    ? `http://${window.location.hostname}:8000`
    : 'http://localhost:8000';
}

export function getInternoApiBase(): string {
  if (environment.useRelativeApiProxy && environment.internoApiBase) {
    return environment.internoApiBase;
  }
  return typeof window !== 'undefined' && window.location?.hostname
    ? `http://${window.location.hostname}:8001`
    : 'http://localhost:8001';
}

export function toAbsoluteApiUrl(pathOrUrl: string): string {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return pathOrUrl;
  }
  const normalized = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${normalized}`;
  }
  return `http://localhost:4200${normalized}`;
}
