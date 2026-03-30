import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Api } from '../../../core/services/api';

interface Procedure {
  id: string;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  creado_en: string;
}

interface VisitCreate {
  id_externo_paciente: string | null;
  procedimiento_id: string;
  realizado_en: string | null;
  notas: string | null;
}

interface CreatedVisit {
  id: string;
  id_externo_paciente: string | null;
  procedimiento_id: string;
  realizado_por: string;
  realizado_en: string;
  notas: string | null;
  creado_en: string;
}

@Component({
  selector: 'app-create-visit',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-visit.html',
  styleUrl: './create-visit.scss'
})
export class CreateVisit implements OnInit {
  private api = inject(Api);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  procedures: Procedure[] = [];

  loadingProcedures = false;
  saving = false;

  error = '';
  success = '';
  createdVisitId = '';
  patientNotFound = false;

  form: VisitCreate = {
    id_externo_paciente: '',
    procedimiento_id: '',
    realizado_en: '',
    notas: ''
  };

  ngOnInit(): void {
    this.loadProcedures();
  }

  loadProcedures(): void {
    this.loadingProcedures = true;
    this.error = '';

    this.api.get<Procedure[]>('/procedures', { only_active: true })
      .pipe(finalize(() => {
        this.loadingProcedures = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.procedures = data;
          if (!this.form.procedimiento_id && this.procedures.length > 0) {
            this.form.procedimiento_id = this.procedures[0].id;
          }
        },
        error: (err) => {
          console.error('load procedures error', err);
          this.error = err?.error?.detail || 'No se pudieron cargar los procedimientos.';
        }
      });
  }

  submit(): void {
    this.error = '';
    this.success = '';
    this.createdVisitId = '';
    this.patientNotFound = false;

    if (!this.form.procedimiento_id) {
      this.error = 'Debes seleccionar un procedimiento.';
      return;
    }

    const payload: VisitCreate = {
      id_externo_paciente: this.form.id_externo_paciente?.trim() || null,
      procedimiento_id: this.form.procedimiento_id,
      realizado_en: this.form.realizado_en?.trim() || null,
      notas: this.form.notas?.trim() || null
    };

    this.saving = true;

    this.api.post<CreatedVisit[] | CreatedVisit>('/visits', payload)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (response) => {
          const created = Array.isArray(response) ? response[0] : response;

          if (!created?.id) {
            this.error = 'La atención se creó, pero no se recibió el id esperado.';
            return;
          }

          this.createdVisitId = created.id;
          this.success = 'Atención creada correctamente.';
          this.resetForm();
        },
        error: (err) => {
          console.error('create visit error', err);

          const detailText =
            typeof err?.error?.detail === 'string'
              ? err.error.detail
              : JSON.stringify(err?.error?.detail || err?.error || '');

          if (
            detailText.includes('fk_atencion_cliente') ||
            detailText.includes('id_externo_paciente') ||
            detailText.includes('is not present in table "cliente"')
          ) {
            this.patientNotFound = true;
            this.error = 'Usuario no registrado, por favor regístrelo.';
            return;
          }

          this.error = err?.error?.detail || 'No se pudo crear la atención.';
        }
      });
  }

  goToDetail(): void {
    if (!this.createdVisitId) return;
    this.router.navigateByUrl(`/visits/${this.createdVisitId}`);
  }

  goToClients(): void {
    this.router.navigateByUrl('/clients');
  }

  resetForm(): void {
    this.form = {
      id_externo_paciente: '',
      procedimiento_id: this.procedures[0]?.id ?? '',
      realizado_en: '',
      notas: ''
    };
  }

  getProcedureLabel(item: Procedure): string {
    return item.descripcion
      ? `${item.nombre} — ${item.descripcion}`
      : item.nombre;
  }
}