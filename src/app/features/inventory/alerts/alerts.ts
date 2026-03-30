import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Api } from '../../../core/services/api';

interface StockMinAlert {
  id: string;
  nombre?: string;
  categoria?: string | null;
  stock_actual?: number;
  stock_minimo?: number;
  [key: string]: unknown;
}

interface ExpiryAlert {
  id: string;
  insumo_id: string;
  codigo: string;
  vence_en: string;
  cantidad_actual: number;
  insumo?: {
    nombre?: string;
    unidad_id?: string;
  } | null;
}

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './alerts.html',
  styleUrl: './alerts.scss'
})
export class Alerts implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  stockMinAlerts: StockMinAlert[] = [];
  expiryAlerts: ExpiryAlert[] = [];

  loadingStockMin = false;
  loadingExpiry = false;

  stockMinError = '';
  expiryError = '';

  days = 30;

  ngOnInit(): void {
    this.loadStockMinAlerts();
    this.loadExpiryAlerts();
  }

  loadStockMinAlerts(): void {
    this.loadingStockMin = true;
    this.stockMinError = '';

    this.api.get<StockMinAlert[]>('/alerts/stock-min')
      .pipe(finalize(() => {
        this.loadingStockMin = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.stockMinAlerts = data;
        },
        error: (err) => {
          console.error('stock min alerts error', err);
          this.stockMinError = err?.error?.detail || 'No se pudieron cargar las alertas de stock mínimo.';
        }
      });
  }

  loadExpiryAlerts(): void {
    this.loadingExpiry = true;
    this.expiryError = '';

    this.api.get<ExpiryAlert[]>('/alerts/expiry', {
      days: this.days
    })
      .pipe(finalize(() => {
        this.loadingExpiry = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.expiryAlerts = data;
        },
        error: (err) => {
          console.error('expiry alerts error', err);
          this.expiryError = err?.error?.detail || 'No se pudieron cargar las alertas de vencimiento.';
        }
      });
  }

  refreshExpiry(): void {
    if (!this.days || this.days < 1) {
      this.days = 30;
    }
    this.loadExpiryAlerts();
  }

  getExpiryStatus(dateStr: string): string {
    const today = new Date();
    const expiry = new Date(dateStr);

    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const diffMs = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencido';
    if (diffDays === 0) return 'Vence hoy';
    return `Vence en ${diffDays} día(s)`;
  }

  getStockName(item: StockMinAlert): string {
    return String(item.nombre ?? item.id ?? '—');
  }

  getStockCategory(item: StockMinAlert): string {
    return String(item.categoria ?? '—');
  }

  getStockActual(item: StockMinAlert): string {
    return String(item.stock_actual ?? '—');
  }

  getStockMinimo(item: StockMinAlert): string {
    return String(item.stock_minimo ?? '—');
  }

  getExpirySupplyName(item: ExpiryAlert): string {
    return item.insumo?.nombre || item.insumo_id;
  }
}