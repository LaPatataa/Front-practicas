import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Api } from '../../../core/services/api';

interface Supply {
  id: string;
  nombre: string;
  categoria: string | null;
  unidad_id: string;
  stock_minimo: number;
  stock_actual: number;
  activo: boolean;
  creado_en: string;
}

interface Unit {
  id: string;
  nombre: string;
  simbolo: string;
  creado_en: string;
}

interface SupplyCreate {
  nombre: string;
  categoria: string | null;
  unidad_id: string;
  stock_minimo: number;
  activo: boolean;
}

@Component({
  selector: 'app-supplies',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './supplies.html',
  styleUrl: './supplies.scss'
})
export class Supplies implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  supplies: Supply[] = [];
  units: Unit[] = [];

  loading = false;
  loadingUnits = false;
  saving = false;
  error = '';
  formError = '';
  formSuccess = '';

  q = '';
  onlyActive = true;

  form: SupplyCreate = {
    nombre: '',
    categoria: '',
    unidad_id: '',
    stock_minimo: 0,
    activo: true
  };

  ngOnInit(): void {
    this.loadUnits();
    this.loadSupplies();
  }

  loadUnits(): void {
    this.loadingUnits = true;

    this.api.get<Unit[]>('/catalog/units')
      .pipe(finalize(() => {
        this.loadingUnits = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.units = data;
          if (!this.form.unidad_id && this.units.length > 0) {
            this.form.unidad_id = this.units[0].id;
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error('units error', err);
          this.formError = 'No se pudieron cargar las unidades.';
          this.cdr.detectChanges();
        }
      });
  }

  loadSupplies(): void {
    const search = this.q.trim();

    this.loading = true;
    this.error = '';
    this.cdr.detectChanges();

    this.api.get<Supply[]>('/catalog/supplies', {
      q: search ? search : undefined,
      only_active: this.onlyActive
    })
    .pipe(finalize(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (data) => {
        this.supplies = data;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('supplies error', err);
        this.error =
          err?.error?.detail ||
          err?.message ||
          'No se pudieron cargar los insumos.';
        this.cdr.detectChanges();
      }
    });
  }

  search(): void {
    this.loadSupplies();
  }

  clearFilters(): void {
    this.q = '';
    this.onlyActive = true;
    this.loadSupplies();
  }

  createSupply(): void {
    this.formError = '';
    this.formSuccess = '';

    const nombre = this.form.nombre.trim();
    const categoria = (this.form.categoria || '').trim();

    if (!nombre) {
      this.formError = 'El nombre es obligatorio.';
      return;
    }

    if (!this.form.unidad_id) {
      this.formError = 'Debes seleccionar una unidad.';
      return;
    }

    if (this.form.stock_minimo < 0) {
      this.formError = 'El stock mínimo no puede ser negativo.';
      return;
    }

    const payload: SupplyCreate = {
      nombre,
      categoria: categoria || null,
      unidad_id: this.form.unidad_id,
      stock_minimo: Number(this.form.stock_minimo),
      activo: this.form.activo
    };

    this.saving = true;

    this.api.post<Supply>('/catalog/supplies', payload)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.formSuccess = 'Insumo creado correctamente.';
          this.resetForm();
          this.loadSupplies();
        },
        error: (err) => {
          console.error('create supply error', err);
          this.formError =
            err?.error?.detail ||
            err?.message ||
            'No se pudo crear el insumo.';
        }
      });
  }

  resetForm(): void {
    this.form = {
      nombre: '',
      categoria: '',
      unidad_id: this.units.length > 0 ? this.units[0].id : '',
      stock_minimo: 0,
      activo: true
    };
  }

  getUnitLabel(unidadId: string): string {
    const unit = this.units.find(u => u.id === unidadId);
    return unit ? `${unit.nombre} (${unit.simbolo})` : unidadId;
  }
}