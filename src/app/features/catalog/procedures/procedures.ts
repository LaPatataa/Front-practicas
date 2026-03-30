import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Api } from '../../../core/services/api';

interface Procedure {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creado_en: string;
}

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

interface ProcedureDefault {
  procedimiento_id: string;
  insumo_id: string;
  cantidad_default: number;
  insumo?: {
    nombre?: string;
    unidad_id?: string;
  } | null;
}

interface ProcedureCreate {
  nombre: string;
  descripcion: string | null;
}

interface DefaultItemCreate {
  insumo_id: string;
  cantidad_default: number;
}

@Component({
  selector: 'app-procedures',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './procedures.html',
  styleUrl: './procedures.scss'
})
export class Procedures implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  procedures: Procedure[] = [];
  supplies: Supply[] = [];
  units: Unit[] = [];
  defaults: ProcedureDefault[] = [];

  loadingProcedures = false;
  loadingDefaults = false;
  loadingSupplies = false;
  loadingUnits = false;
  savingProcedure = false;
  savingDefault = false;

  procedureError = '';
  procedureSuccess = '';
  defaultsError = '';
  defaultSuccess = '';
  pageError = '';

  q = '';
  onlyActive = true;
  selectedProcedureId = '';

  procedureForm: ProcedureCreate = {
    nombre: '',
    descripcion: ''
  };

  defaultForm: DefaultItemCreate = {
    insumo_id: '',
    cantidad_default: 1
  };

  ngOnInit(): void {
    this.loadUnits();
    this.loadSupplies();
    this.loadProcedures();
  }

  loadProcedures(): void {
    const search = this.q.trim();

    this.loadingProcedures = true;
    this.pageError = '';

    this.api.get<Procedure[]>('/procedures', {
      q: search ? search : undefined,
      only_active: this.onlyActive
    })
    .pipe(finalize(() => {
      this.loadingProcedures = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (data) => {
        this.procedures = data;

        if (!this.selectedProcedureId && this.procedures.length > 0) {
          this.selectedProcedureId = this.procedures[0].id;
          this.loadDefaults();
        } else if (this.selectedProcedureId) {
          const stillExists = this.procedures.some(x => x.id === this.selectedProcedureId);
          if (stillExists) {
            this.loadDefaults();
          } else {
            this.defaults = [];
          }
        }
      },
      error: (err) => {
        console.error('load procedures error', err);
        this.pageError = err?.error?.detail || 'No se pudieron cargar los procedimientos.';
      }
    });
  }

  loadSupplies(): void {
    this.loadingSupplies = true;

    this.api.get<Supply[]>('/catalog/supplies', {
      only_active: true
    })
    .pipe(finalize(() => {
      this.loadingSupplies = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (data) => {
        this.supplies = data;
        if (!this.defaultForm.insumo_id && this.supplies.length > 0) {
          this.defaultForm.insumo_id = this.supplies[0].id;
        }
      },
      error: (err) => {
        console.error('load supplies error', err);
        this.defaultsError = err?.error?.detail || 'No se pudieron cargar los insumos.';
      }
    });
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
        },
        error: (err) => {
          console.error('load units error', err);
        }
      });
  }

  loadDefaults(): void {
    if (!this.selectedProcedureId) {
      this.defaults = [];
      return;
    }

    this.loadingDefaults = true;
    this.defaultsError = '';

    this.api.get<ProcedureDefault[]>(`/procedures/${this.selectedProcedureId}/defaults`)
      .pipe(finalize(() => {
        this.loadingDefaults = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.defaults = data;
        },
        error: (err) => {
          console.error('load defaults error', err);
          this.defaultsError = err?.error?.detail || 'No se pudieron cargar los insumos por defecto.';
        }
      });
  }

  searchProcedures(): void {
    this.loadProcedures();
  }

  clearProcedureFilters(): void {
    this.q = '';
    this.onlyActive = true;
    this.loadProcedures();
  }

  onProcedureChange(): void {
    this.loadDefaults();
  }

  createProcedure(): void {
    this.procedureError = '';
    this.procedureSuccess = '';

    const nombre = this.procedureForm.nombre.trim();
    const descripcion = (this.procedureForm.descripcion || '').trim();

    if (!nombre) {
      this.procedureError = 'El nombre del procedimiento es obligatorio.';
      return;
    }

    const payload: ProcedureCreate = {
      nombre,
      descripcion: descripcion || null
    };

    this.savingProcedure = true;

    this.api.post<Procedure>('/procedures', payload)
      .pipe(finalize(() => {
        this.savingProcedure = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.procedureSuccess = 'Procedimiento creado correctamente.';
          this.resetProcedureForm();
          this.loadProcedures();
        },
        error: (err) => {
          console.error('create procedure error', err);
          this.procedureError = err?.error?.detail || 'No se pudo crear el procedimiento.';
        }
      });
  }

  addDefault(): void {
    this.defaultsError = '';
    this.defaultSuccess = '';

    if (!this.selectedProcedureId) {
      this.defaultsError = 'Debes seleccionar un procedimiento.';
      return;
    }

    if (!this.defaultForm.insumo_id) {
      this.defaultsError = 'Debes seleccionar un insumo.';
      return;
    }

    if (!this.defaultForm.cantidad_default || this.defaultForm.cantidad_default <= 0) {
      this.defaultsError = 'La cantidad por defecto debe ser mayor a 0.';
      return;
    }

    const payload: DefaultItemCreate = {
      insumo_id: this.defaultForm.insumo_id,
      cantidad_default: Number(this.defaultForm.cantidad_default)
    };

    this.savingDefault = true;

    this.api.post(`/procedures/${this.selectedProcedureId}/defaults`, payload)
      .pipe(finalize(() => {
        this.savingDefault = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.defaultSuccess = 'Insumo por defecto agregado correctamente.';
          this.resetDefaultForm();
          this.loadDefaults();
        },
        error: (err) => {
          console.error('add default error', err);
          this.defaultsError = err?.error?.detail || 'No se pudo agregar el insumo por defecto.';
        }
      });
  }

  resetProcedureForm(): void {
    this.procedureForm = {
      nombre: '',
      descripcion: ''
    };
  }

  resetDefaultForm(): void {
    this.defaultForm = {
      insumo_id: this.supplies.length > 0 ? this.supplies[0].id : '',
      cantidad_default: 1
    };
  }

  getUnitLabel(unidadId?: string | null): string {
    if (!unidadId) return '—';
    const unit = this.units.find(u => u.id === unidadId);
    return unit ? `${unit.nombre} (${unit.simbolo})` : unidadId;
  }

  getSelectedProcedureName(): string {
    const item = this.procedures.find(x => x.id === this.selectedProcedureId);
    return item?.nombre || 'Procedimiento';
  }

  trackDefault = (_: number, item: ProcedureDefault): string => {
    return `${item.procedimiento_id}-${item.insumo_id}`;
  };
}