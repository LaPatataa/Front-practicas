import { HttpInterceptorFn } from '@angular/common/http';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('access_token');

  const headers: Record<string, string> = {};

  if (req.url.includes('ngrok-free.app')) {
    headers['ngrok-skip-browser-warning'] = '1';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const cloned = req.clone({
    setHeaders: headers
  });

  return next(cloned);
};