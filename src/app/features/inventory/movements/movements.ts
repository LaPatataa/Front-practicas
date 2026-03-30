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

interface Movement {
  id: string;
  insumo_id: string;
  lote_id?: string | null;
  tipo: string;
  cantidad: number;
  motivo?: string | null;
  atencion_relacionada_id?: string | null;
  atencion_relacionada?: string | null;
  creado_por?: string | null;
  creado_en?: string | null;
  [key: string]: unknown;
}

@Component({
  selector: 'app-movements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './movements.html',
  styleUrl: './movements.scss'
})
export class Movements implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  movements: Movement[] = [];
  supplies: Supply[] = [];

  loading = false;
  loadingSupplies = false;
  error = '';

  filters = {
    insumo_id: '',
    lote_id: '',
    tipo: '',
    atencion_id: '',
    desde: '',
    hasta: ''
  };

  readonly movementTypes = [
    { value: '', label: 'Todos' },
    { value: 'ENTRADA', label: 'Entrada' },
    { value: 'SALIDA', label: 'Salida' },
    { value: 'AJUSTE', label: 'Ajuste' },
    { value: 'MERMA', label: 'Merma' },
    { value: 'BAJA', label: 'Baja' }
  ];

  ngOnInit(): void {
    this.loadSupplies();
    this.loadMovements();
  }

  loadSupplies(): void {
    this.loadingSupplies = true;

    this.api.get<Supply[]>('/catalog/supplies', { only_active: false })
      .pipe(finalize(() => {
        this.loadingSupplies = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.supplies = data;
        },
        error: (err) => {
          console.error('load supplies for movements error', err);
        }
      });
  }

  loadMovements(): void {
    this.loading = true;
    this.error = '';

    this.api.get<Movement[]>('/movements', {
      insumo_id: this.filters.insumo_id || undefined,
      lote_id: this.filters.lote_id || undefined,
      tipo: this.filters.tipo || undefined,
      atencion_id: this.filters.atencion_id || undefined,
      desde: this.filters.desde || undefined,
      hasta: this.filters.hasta || undefined
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.movements = data;
        },
        error: (err) => {
          console.error('load movements error', err);
          this.error = err?.error?.detail || 'No se pudieron cargar los movimientos.';
        }
      });
  }

  search(): void {
    this.loadMovements();
  }

  clearFilters(): void {
    this.filters = {
      insumo_id: '',
      lote_id: '',
      tipo: '',
      atencion_id: '',
      desde: '',
      hasta: ''
    };
    this.loadMovements();
  }

  getSupplyName(insumoId: string): string {
    const item = this.supplies.find(x => x.id === insumoId);
    return item?.nombre || insumoId;
  }

  getRelatedAttention(item: Movement): string {
    return String(item.atencion_relacionada_id ?? item.atencion_relacionada ?? '—');
  }
}