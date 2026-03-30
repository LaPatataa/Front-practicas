import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(Auth);
  private router = inject(Router);

  loading = false;
  error = '';

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  submit(): void {
    if (this.form.invalid || this.loading) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.value.email ?? '';
    const password = this.form.value.password ?? '';

    this.loading = true;
    this.error = '';

    this.auth.login(email, password).subscribe({
      next: () => {
        this.auth.me().subscribe({
          next: () => {
            this.loading = false;
            this.router.navigateByUrl('/home');
          },
          error: () => {
            this.loading = false;
            this.error = 'Se inició sesión, pero no se pudo validar el perfil.';
          }
        });
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.message || 'No se pudo iniciar sesión.';
      }
    });
  }
}