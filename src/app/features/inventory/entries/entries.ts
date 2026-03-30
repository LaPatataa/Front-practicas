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

interface Lot {
  id: string;
  insumo_id: string;
  codigo: string;
  vence_en: string;
  cantidad_actual: number;
  creado_en: string;
}

interface Visit {
  id: string;
  id_externo_paciente?: string | null;
  procedimiento_id: string;
  procedimiento_nombre?: string | null;
  realizado_en?: string | null;
  notas?: string | null;
}

interface EntryCreate {
  insumo_id: string;
  codigo_lote: string;
  vence_en: string;
  cantidad: number;
  motivo: string | null;
}

interface ExitCreate {
  insumo_id: string;
  lote_id: string;
  tipo: string;
  cantidad: number;
  motivo: string | null;
  atencion_relacionada: string | null;
}

@Component({
  selector: 'app-entries',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './entries.html',
  styleUrl: './entries.scss'
})
export class Entries implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  supplies: Supply[] = [];
  lots: Lot[] = [];
  visits: Visit[] = [];

  loadingSupplies = false;
  loadingLots = false;
  loadingVisits = false;
  savingEntry = false;
  savingExit = false;

  error = '';
  lotsError = '';
  entryError = '';
  entrySuccess = '';
  exitError = '';
  exitSuccess = '';

  onlyAvailableLots = true;
  selectedSupplyIdForLots = '';

  entryForm: EntryCreate = {
    insumo_id: '',
    codigo_lote: '',
    vence_en: '',
    cantidad: 1,
    motivo: 'COMPRA'
  };

  exitForm: ExitCreate = {
    insumo_id: '',
    lote_id: '',
    tipo: 'SALIDA',
    cantidad: 1,
    motivo: 'SALIDA',
    atencion_relacionada: ''
  };

  readonly entryReasons = [
    { value: 'COMPRA', label: 'Compra' },
    { value: 'REPOSICION', label: 'Reposición' },
    { value: 'AJUSTE', label: 'Ajuste' }
  ];

  readonly exitTypes = [
    { value: 'SALIDA', label: 'Salida' },
    { value: 'MERMA', label: 'Merma' },
    { value: 'AJUSTE', label: 'Ajuste' }
  ];

  readonly exitReasons = [
    { value: 'SALIDA', label: 'Salida' },
    { value: 'MERMA', label: 'Merma' },
    { value: 'AJUSTE', label: 'Ajuste' }
  ];

  ngOnInit(): void {
    this.loadSupplies();
    this.loadVisits();
  }

  loadSupplies(): void {
    this.loadingSupplies = true;
    this.error = '';

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

        if (this.supplies.length > 0) {
          if (!this.entryForm.insumo_id) {
            this.entryForm.insumo_id = this.supplies[0].id;
          }

          if (!this.exitForm.insumo_id) {
            this.exitForm.insumo_id = this.supplies[0].id;
          }

          if (!this.selectedSupplyIdForLots) {
            this.selectedSupplyIdForLots = this.supplies[0].id;
          }

          this.loadLotsForSelectedSupply();
        }
      },
      error: (err) => {
        console.error('load supplies error', err);
        this.error = err?.error?.detail || 'No se pudieron cargar los insumos.';
      }
    });
  }

  loadVisits(): void {
    this.loadingVisits = true;

    this.api.get<Visit[]>('/visits')
      .pipe(finalize(() => {
        this.loadingVisits = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.visits = data;
        },
        error: (err) => {
          console.error('load visits error', err);
          this.exitError = err?.error?.detail || 'No se pudieron cargar las atenciones.';
        }
      });
  }

  loadLotsForSelectedSupply(): void {
    if (!this.selectedSupplyIdForLots) {
      this.lots = [];
      return;
    }

    this.loadingLots = true;
    this.lotsError = '';
    this.lots = [];

    this.api.get<Lot[]>('/inventory/lots', {
      insumo_id: this.selectedSupplyIdForLots,
      only_available: this.onlyAvailableLots
    })
    .pipe(finalize(() => {
      this.loadingLots = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (data) => {
        this.lots = data;

        if (this.exitForm.insumo_id === this.selectedSupplyIdForLots && this.lots.length > 0) {
          const exists = this.lots.some(x => x.id === this.exitForm.lote_id);
          if (!exists) {
            this.exitForm.lote_id = this.lots[0].id;
          }
        }
      },
      error: (err) => {
        console.error('load lots error', err);
        this.lotsError = err?.error?.detail || 'No se pudieron cargar los lotes.';
      }
    });
  }

  onEntrySupplyChange(): void {
    if (!this.entryForm.insumo_id) return;
    this.selectedSupplyIdForLots = this.entryForm.insumo_id;
    this.loadLotsForSelectedSupply();
  }

  onExitSupplyChange(): void {
    if (!this.exitForm.insumo_id) return;
    this.selectedSupplyIdForLots = this.exitForm.insumo_id;
    this.exitForm.lote_id = '';
    this.loadLotsForSelectedSupply();
  }

  getLotsForExit(): Lot[] {
    return this.lots.filter(x => x.insumo_id === this.exitForm.insumo_id);
  }

  getSupplyLabel(item: Supply): string {
    return `${item.nombre} (stock actual: ${item.stock_actual})`;
  }

  getVisitLabel(item: Visit): string {
    const paciente = item.id_externo_paciente || 'Sin paciente';
    const procedimiento = item.procedimiento_nombre || item.procedimiento_id;
    const fecha = item.realizado_en
      ? new Date(item.realizado_en).toLocaleString()
      : 'Sin fecha';

    return `${paciente} — ${procedimiento} — ${fecha}`;
  }

  requiresVisit(): boolean {
    return this.exitForm.tipo === 'SALIDA';
  }

  submitEntry(): void {
    this.entryError = '';
    this.entrySuccess = '';

    const codigoLote = this.entryForm.codigo_lote.trim();
    const venceEn = this.entryForm.vence_en.trim();

    if (!this.entryForm.insumo_id) {
      this.entryError = 'Debes seleccionar un insumo.';
      return;
    }

    if (!codigoLote) {
      this.entryError = 'El código de lote es obligatorio.';
      return;
    }

    if (!venceEn) {
      this.entryError = 'La fecha de vencimiento es obligatoria.';
      return;
    }

    if (!this.entryForm.cantidad || this.entryForm.cantidad <= 0) {
      this.entryError = 'La cantidad debe ser mayor a 0.';
      return;
    }

    const payload: EntryCreate = {
      insumo_id: this.entryForm.insumo_id,
      codigo_lote: codigoLote,
      vence_en: venceEn,
      cantidad: Number(this.entryForm.cantidad),
      motivo: this.entryForm.motivo
    };

    this.savingEntry = true;

    this.api.post('/inventory/entries', payload)
      .pipe(finalize(() => {
        this.savingEntry = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.entrySuccess = 'Entrada registrada correctamente.';
          const keepSupply = this.entryForm.insumo_id;
          this.resetEntryForm(keepSupply);
          this.selectedSupplyIdForLots = keepSupply;
          this.loadSupplies();
        },
        error: (err) => {
          console.error('entry error', err);
          this.entryError = err?.error?.detail || 'No se pudo registrar la entrada.';
        }
      });
  }

  submitExit(): void {
    this.exitError = '';
    this.exitSuccess = '';

    if (!this.exitForm.insumo_id) {
      this.exitError = 'Debes seleccionar un insumo.';
      return;
    }

    if (!this.exitForm.lote_id) {
      this.exitError = 'Debes seleccionar un lote.';
      return;
    }

    if (!this.exitForm.tipo) {
      this.exitError = 'Debes seleccionar un tipo de salida.';
      return;
    }

    if (!this.exitForm.cantidad || this.exitForm.cantidad <= 0) {
      this.exitError = 'La cantidad debe ser mayor a 0.';
      return;
    }

    if (this.requiresVisit() && !this.exitForm.atencion_relacionada) {
      this.exitError = 'Debes seleccionar una atención para una salida.';
      return;
    }

    if (!this.requiresVisit()) {
      this.exitForm.atencion_relacionada = '';
    }

    const payload: ExitCreate = {
      insumo_id: this.exitForm.insumo_id,
      lote_id: this.exitForm.lote_id,
      tipo: this.exitForm.tipo,
      cantidad: Number(this.exitForm.cantidad),
      motivo: this.exitForm.motivo,
      atencion_relacionada: this.exitForm.atencion_relacionada?.trim() || null
    };

    this.savingExit = true;

    this.api.post('/inventory/exits', payload)
      .pipe(finalize(() => {
        this.savingExit = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.exitSuccess = 'Salida registrada correctamente.';
          const keepSupply = this.exitForm.insumo_id;
          this.resetExitForm(keepSupply);
          this.selectedSupplyIdForLots = keepSupply;
          this.loadSupplies();
        },
        error: (err) => {
          console.error('exit error', err);
          this.exitError = err?.error?.detail || 'No se pudo registrar la salida.';
        }
      });
  }

  resetEntryForm(keepSupplyId?: string): void {
    this.entryForm = {
      insumo_id: keepSupplyId || (this.supplies[0]?.id ?? ''),
      codigo_lote: '',
      vence_en: '',
      cantidad: 1,
      motivo: 'COMPRA'
    };
  }

  resetExitForm(keepSupplyId?: string): void {
    const supplyId = keepSupplyId || (this.supplies[0]?.id ?? '');
    const availableLots = this.lots.filter(x => x.insumo_id === supplyId);

    this.exitForm = {
      insumo_id: supplyId,
      lote_id: availableLots[0]?.id ?? '',
      tipo: 'SALIDA',
      cantidad: 1,
      motivo: 'SALIDA',
      atencion_relacionada: ''
    };
  }
}