import { Injectable } from '@angular/core';
import { from, map, Observable, tap } from 'rxjs';
import { createClient, Session, User } from '@supabase/supabase-js';
import { environment } from '../../../environments/environments';

export interface MeResponse {
  id: string;
  email?: string | null;
  roles: string[];
}

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private supabase = createClient(environment.supabaseUrl, environment.supabaseAnonKey);

  private readonly tokenKey = 'access_token';
  private readonly meKey = 'auth_me';

  login(email: string, password: string): Observable<{ user: User | null; session: Session | null }> {
    return from(
      this.supabase.auth.signInWithPassword({
        email,
        password
      })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw error;

        const token = data.session?.access_token;
        if (token) {
          localStorage.setItem(this.tokenKey, token);
        }

        return {
          user: data.user,
          session: data.session
        };
      })
    );
  }

  logout(): Observable<void> {
    return from(this.supabase.auth.signOut()).pipe(
      map(({ error }) => {
        this.clearSession();
        if (error) throw error;
      })
    );
  }

  me(): Observable<MeResponse> {
    return from(
      fetch(`${environment.apiUrl}/auth/me`, {
        headers: {
          Authorization: `Bearer ${this.getToken()}`,
          'ngrok-skip-browser-warning': '1'
        }
      }).then(async (response) => {
        if (!response.ok) {
          throw new Error('No se pudo obtener la sesión.');
        }
        return response.json() as Promise<MeResponse>;
      })
    ).pipe(
      tap((data) => {
        localStorage.setItem(this.meKey, JSON.stringify(data));
      })
    );
  }

  getStoredMe(): MeResponse | null {
    const raw = localStorage.getItem(this.meKey);
    if (!raw) return null;

    try {
      return JSON.parse(raw) as MeResponse;
    } catch {
      return null;
    }
  }

  getRoles(): string[] {
    return this.getStoredMe()?.roles ?? [];
  }

  hasRole(role: string): boolean {
    return this.getRoles().includes(role);
  }

  hasAnyRole(roles: string[]): boolean {
    const current = this.getRoles();
    return roles.some((role) => current.includes(role));
  }

  isAdmin(): boolean {
    return this.hasRole('ADMIN');
  }

  isAuxiliar(): boolean {
    return this.hasRole('AUXILIAR');
  }

  isOdontologo(): boolean {
    return this.hasRole('ODONTOLOGO');
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  clearSession(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.meKey);
  }
}