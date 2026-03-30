import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';
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
  consumos: VisitConsumption[];
  movimientos: InventoryMovement[];
}

interface VisitConsumption {
  id: string;
  atencion_id: string;
  insumo_id: string;
  cantidad: number;
  creado_en: string;
}

interface InventoryMovement {
  id: string;
  insumo_id: string;
  tipo: string;
  cantidad: number;
  motivo: string | null;
  atencion_relacionada?: string | null;
  atencion_relacionada_id?: string | null;
  lote_id?: string | null;
  creado_por?: string | null;
  creado_en?: string | null;
  [key: string]: unknown;
}

@Component({
  selector: 'app-visit-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './visit-detail.html',
  styleUrl: './visit-detail.scss'
})
export class VisitDetail implements OnInit {
  private api = inject(Api);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  loading = false;
  error = '';
  visitId = '';

  detail: VisitDetailResponse | null = null;
  supplies: Supply[] = [];

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

    forkJoin({
      detail: this.api.get<VisitDetailResponse>(`/visits/${this.visitId}`),
      supplies: this.api.get<Supply[]>('/catalog/supplies', { only_active: false }).pipe(
        catchError((err) => {
          console.error('load supplies for visit detail error', err);
          return of([]);
        })
      )
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: ({ detail, supplies }) => {
          this.detail = detail;
          this.supplies = supplies;
        },
        error: (err) => {
          console.error('visit detail error', err);
          this.error = err?.error?.detail || 'No se pudo cargar el detalle de la atención.';
        }
      });
  }

  goToConsume(): void {
    if (!this.visitId) return;
    this.router.navigateByUrl(`/visits/${this.visitId}/consume`);
  }

  getSupplyName(insumoId: string): string {
    const item = this.supplies.find(x => x.id === insumoId);
    return item?.nombre || insumoId;
  }

  getMovementRelatedAttention(movement: InventoryMovement): string {
    return String(movement.atencion_relacionada ?? movement.atencion_relacionada_id ?? '—');
  }

  hasConsumptions(): boolean {
    return !!this.detail?.consumos?.length;
  }

  hasMovements(): boolean {
    return !!this.detail?.movimientos?.length;
  }
}