import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Api } from '../../../core/services/api';

interface Unit {
  id: string;
  nombre: string;
  simbolo: string;
  creado_en: string;
}

interface UnitCreate {
  nombre: string;
  simbolo: string;
}

@Component({
  selector: 'app-units',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './units.html',
  styleUrl: './units.scss'
})
export class Units implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  units: Unit[] = [];

  loading = false;
  saving = false;
  error = '';
  success = '';

  form: UnitCreate = {
    nombre: '',
    simbolo: ''
  };

  ngOnInit(): void {
    this.loadUnits();
  }

  loadUnits(): void {
    this.loading = true;
    this.error = '';

    this.api.get<Unit[]>('/catalog/units')
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.units = data;
        },
        error: (err) => {
          console.error('load units error', err);
          this.error = err?.error?.detail || 'No se pudieron cargar las unidades.';
        }
      });
  }

  createUnit(): void {
    this.error = '';
    this.success = '';

    const payload: UnitCreate = {
      nombre: this.form.nombre.trim(),
      simbolo: this.form.simbolo.trim()
    };

    if (!payload.nombre) {
      this.error = 'El nombre es obligatorio.';
      return;
    }

    if (!payload.simbolo) {
      this.error = 'El símbolo es obligatorio.';
      return;
    }

    this.saving = true;

    this.api.post('/catalog/units', payload)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.success = 'Unidad creada correctamente.';
          this.resetForm();
          this.loadUnits();
        },
        error: (err) => {
          console.error('create unit error', err);
          this.error = err?.error?.detail || 'No se pudo crear la unidad.';
        }
      });
  }

  resetForm(): void {
    this.form = {
      nombre: '',
      simbolo: ''
    };
  }
}