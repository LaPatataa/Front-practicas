import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Api } from '../../../core/services/api';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

interface Unit {
  id: string;
  nombre: string;
  simbolo: string;
  creado_en: string;
}

interface ConsumptionBySupply {
  insumo_id: string;
  insumo_nombre: string;
  unidad_id: string;
  cantidad_total: number;
}

interface ConsumptionByProcedure {
  procedimiento_id: string;
  procedimiento_nombre: string;
  cantidad_total: number;
}

type ReportRow = ConsumptionBySupply | ConsumptionByProcedure;

@Component({
  selector: 'app-consumption',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './consumption.html',
  styleUrl: './consumption.scss',
  providers: [DatePipe]
})
export class Consumption implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  private datePipe = inject(DatePipe);

  rows: ReportRow[] = [];
  units: Unit[] = [];

  loading = false;
  loadingUnits = false;
  exportingPdf = false;
  error = '';

  filters = {
    desde: '',
    hasta: '',
    group: 'insumo',
    only_clinical: true
  };

  ngOnInit(): void {
    this.setDefaultDates();
    this.loadUnits();
    this.loadReport();
  }

  setDefaultDates(): void {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');

    this.filters.hasta = `${yyyy}-${mm}-${dd}`;
    this.filters.desde = `${yyyy}-${mm}-01`;
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
          console.error('load units for report error', err);
        }
      });
  }

  loadReport(): void {
    if (!this.filters.desde || !this.filters.hasta) {
      this.error = 'Debes indicar un rango de fechas.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.api.get<ReportRow[]>('/reports/consumption', {
      desde: this.filters.desde,
      hasta: this.filters.hasta,
      group: this.filters.group,
      only_clinical: this.filters.only_clinical
    })
      .pipe(finalize(() => {
        this.loading = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: (data) => {
          this.rows = data;
        },
        error: (err) => {
          console.error('load report error', err);
          this.error = err?.error?.detail || 'No se pudo cargar el reporte.';
        }
      });
  }

  search(): void {
    this.loadReport();
  }

  clearFilters(): void {
    this.setDefaultDates();
    this.filters.group = 'insumo';
    this.filters.only_clinical = true;
    this.loadReport();
  }

  isGroupBySupply(): boolean {
    return this.filters.group === 'insumo';
  }

  getUnitLabel(unidadId: string): string {
    const unit = this.units.find(x => x.id === unidadId);
    return unit ? `${unit.nombre} (${unit.simbolo})` : unidadId;
  }

  getSupplyRow(row: ReportRow): ConsumptionBySupply {
    return row as ConsumptionBySupply;
  }

  getProcedureRow(row: ReportRow): ConsumptionByProcedure {
    return row as ConsumptionByProcedure;
  }

  exportPdf(): void {
    if (!this.rows.length) {
      this.error = 'No hay datos para exportar.';
      return;
    }

    this.exportingPdf = true;
    this.error = '';

    try {
      const doc = new jsPDF();

      const title = this.isGroupBySupply()
        ? 'Reporte de consumo por insumo'
        : 'Reporte de consumo por procedimiento';

      const subtitle = [
        `Desde: ${this.filters.desde}`,
        `Hasta: ${this.filters.hasta}`,
        `Solo clínico: ${this.filters.only_clinical ? 'Sí' : 'No'}`
      ].join(' | ');

      doc.setFontSize(16);
      doc.text(title, 14, 16);

      doc.setFontSize(10);
      doc.text(subtitle, 14, 23);

      const generatedAt = this.datePipe.transform(new Date(), 'short') || '';
      doc.text(`Generado: ${generatedAt}`, 14, 29);

      if (this.isGroupBySupply()) {
        const head = [['Insumo', 'Unidad', 'Cantidad total']];
        const body = this.rows.map((row) => {
          const item = this.getSupplyRow(row);
          return [
            item.insumo_nombre,
            this.getUnitLabel(item.unidad_id),
            String(item.cantidad_total)
          ];
        });

        autoTable(doc, {
          startY: 36,
          head,
          body
        });
      } else {
        const head = [['Procedimiento', 'Cantidad total']];
        const body = this.rows.map((row) => {
          const item = this.getProcedureRow(row);
          return [
            item.procedimiento_nombre,
            String(item.cantidad_total)
          ];
        });

        autoTable(doc, {
          startY: 36,
          head,
          body
        });
      }

      const fileSuffix = this.isGroupBySupply() ? 'insumos' : 'procedimientos';
      doc.save(`reporte-consumo-${fileSuffix}-${this.filters.desde}-a-${this.filters.hasta}.pdf`);
    } catch (err) {
      console.error('export pdf error', err);
      this.error = 'No se pudo generar el PDF.';
    } finally {
      this.exportingPdf = false;
      this.cdr.detectChanges();
    }
  }
}