import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
import { Api } from '../../../core/services/api';

interface VisitDetailResponse {
  atencion: {
    id: string;
    id_externo_paciente: string | null;
    procedimiento_id: string;
    realizado_por: string;
    realizado_en: string;
    notas: string | null;
    creado_en: string;
  };
  consumos: Array<Record<string, unknown>>;
  movimientos: Array<Record<string, unknown>>;
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

interface Lot {
  id: string;
  insumo_id: string;
  codigo: string;
  vence_en: string;
  cantidad_actual: number;
  creado_en: string;
}

interface ConsumeItemForm {
  insumo_id: string;
  insumo_nombre: string;
  cantidad: number;
  lote_id: string;
  lots: Lot[];
}

interface ConsumeRequest {
  items: Array<{
    insumo_id: string;
    lote_id: string;
    cantidad: number;
  }>;
  motivo: string | null;
}

@Component({
  selector: 'app-consume',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consume.html',
  styleUrl: './consume.scss'
})
export class Consume implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  visitId = '';
  loading = false;
  saving = false;
  error = '';
  success = '';

  detail: VisitDetailResponse | null = null;
  items: ConsumeItemForm[] = [];
  motivo = 'Consumo por atención';

  ngOnInit(): void {
    this.visitId = this.route.snapshot.paramMap.get('id') || '';
    if (!this.visitId) {
      this.error = 'No se recibió el id de la atención.';
      return;
    }
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.error = '';
    this.success = '';
    this.items = [];

    this.api.get<VisitDetailResponse>(`/visits/${this.visitId}`)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (detail) => {
          this.detail = detail;
          this.loadDefaultsAndLots();
        },
        error: (err) => {
          console.error('load visit detail error', err);
          this.error = err?.error?.detail || 'No se pudo cargar la atención.';
        }
      });
  }

  loadDefaultsAndLots(): void {
    if (!this.detail?.atencion?.procedimiento_id) {
      this.error = 'La atención no tiene procedimiento asociado.';
      return;
    }

    const procedimientoId = this.detail.atencion.procedimiento_id;

    this.loading = true;

    this.api.get<ProcedureDefault[]>(`/procedures/${procedimientoId}/defaults`)
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (defaults) => {
          if (!defaults.length) {
            this.items = [];
            return;
          }

          const requests = defaults.map((item) =>
            this.api.get<Lot[]>('/inventory/lots', {
              insumo_id: item.insumo_id,
              only_available: true
            }).pipe(
              catchError((err) => {
                console.error('load lots for default error', err);
                return of([]);
              })
            )
          );

          this.loading = true;

          forkJoin(requests)
            .pipe(finalize(() => {
              this.loading = false;
              this.cdr.detectChanges();
            }))
            .subscribe({
              next: (lotsByItem) => {
                this.items = defaults.map((def, index) => {
                  const lots = lotsByItem[index] || [];
                  return {
                    insumo_id: def.insumo_id,
                    insumo_nombre: def.insumo?.nombre || def.insumo_id,
                    cantidad: Number(def.cantidad_default),
                    lote_id: lots[0]?.id ?? '',
                    lots
                  };
                });
              },
              error: (err) => {
                console.error('forkJoin lots error', err);
                this.error = 'No se pudieron cargar los lotes para los insumos del procedimiento.';
              }
            });
        },
        error: (err) => {
          console.error('load defaults error', err);
          this.error = err?.error?.detail || 'No se pudieron cargar los insumos por defecto.';
        }
      });
  }

  submit(): void {
    this.error = '';
    this.success = '';

    if (!this.items.length) {
      this.error = 'No hay insumos para consumir.';
      return;
    }

    for (const item of this.items) {
      if (!item.lote_id) {
        this.error = `Debes seleccionar un lote para ${item.insumo_nombre}.`;
        return;
      }

      if (!item.cantidad || item.cantidad <= 0) {
        this.error = `La cantidad para ${item.insumo_nombre} debe ser mayor a 0.`;
        return;
      }
    }

    const payload: ConsumeRequest = {
      items: this.items.map((item) => ({
        insumo_id: item.insumo_id,
        lote_id: item.lote_id,
        cantidad: Number(item.cantidad)
      })),
      motivo: this.motivo.trim() || null
    };

    this.saving = true;

    this.api.post(`/visits/${this.visitId}/consume-defaults`, payload)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.success = 'Consumo registrado correctamente.';
        },
        error: (err) => {
          console.error('consume defaults error', err);
          this.error = err?.error?.detail || 'No se pudo registrar el consumo.';
        }
      });
  }

  goToDetail(): void {
    this.router.navigateByUrl(`/visits/${this.visitId}`);
  }
}