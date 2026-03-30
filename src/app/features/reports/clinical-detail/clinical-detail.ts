import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Api } from '../../../core/services/api';
import { jsPDF } from 'jspdf';
import { autoTable } from 'jspdf-autotable';

interface ClinicalDetailRow {
  movimiento_id: string;
  atencion_id: string;
  paciente_id_externo?: string | null;
  paciente_nombre?: string | null;
  procedimiento_id?: string | null;
  procedimiento_nombre?: string | null;
  realizado_en?: string | null;
  realizado_por?: string | null;
  insumo_id?: string | null;
  insumo_nombre?: string | null;
  lote_id?: string | null;
  lote_codigo?: string | null;
  cantidad?: number | null;
  motivo?: string | null;
  creado_en?: string | null;
}

@Component({
  selector: 'app-clinical-detail-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clinical-detail.html',
  styleUrl: './clinical-detail.scss',
  providers: [DatePipe]
})
export class ClinicalDetail implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);
  private datePipe = inject(DatePipe);

  rows: ClinicalDetailRow[] = [];
  loading = false;
  exportingPdf = false;
  error = '';

  filters = {
    desde: '',
    hasta: '',
    q: ''
  };

  ngOnInit(): void {
    this.setDefaultDates();
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

  loadReport(): void {
    if (!this.filters.desde || !this.filters.hasta) {
      this.error = 'Debes indicar un rango de fechas.';
      return;
    }

    this.loading = true;
    this.error = '';

    this.api.get<ClinicalDetailRow[]>('/reports/clinical-detail', {
      desde: this.filters.desde,
      hasta: this.filters.hasta,
      q: this.filters.q.trim() || undefined
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
          console.error('clinical detail report error', err);
          this.error = err?.error?.detail || 'No se pudo cargar el reporte clínico detallado.';
        }
      });
  }

  search(): void {
    this.loadReport();
  }

  clearFilters(): void {
    this.setDefaultDates();
    this.filters.q = '';
    this.loadReport();
  }

  exportPdf(): void {
    if (!this.rows.length) {
      this.error = 'No hay datos para exportar.';
      return;
    }

    this.exportingPdf = true;
    this.error = '';

    try {
      const doc = new jsPDF('landscape');

      doc.setFontSize(16);
      doc.text('Reporte clínico detallado', 14, 16);

      doc.setFontSize(10);
      doc.text(
        `Desde: ${this.filters.desde} | Hasta: ${this.filters.hasta} | Filtro: ${this.filters.q || '—'}`,
        14,
        23
      );

      const generatedAt = this.datePipe.transform(new Date(), 'short') || '';
      doc.text(`Generado: ${generatedAt}`, 14, 29);

      const head = [[
        'Paciente ID',
        'Paciente',
        'Procedimiento',
        'Fecha/Hora',
        'Profesional',
        'Insumo',
        'Cantidad',
        'Lote',
        'Motivo'
      ]];

      const body = this.rows.map((row) => [
        row.paciente_id_externo || '—',
        row.paciente_nombre || '—',
        row.procedimiento_nombre || row.procedimiento_id || '—',
        row.realizado_en ? (this.datePipe.transform(row.realizado_en, 'short') || row.realizado_en) : '—',
        row.realizado_por || '—',
        row.insumo_nombre || row.insumo_id || '—',
        String(row.cantidad ?? '—'),
        row.lote_codigo || row.lote_id || '—',
        row.motivo || '—'
      ]);

      autoTable(doc, {
        startY: 36,
        head,
        body,
        styles: {
          fontSize: 8
        }
      });

      doc.save(`reporte-clinico-detallado-${this.filters.desde}-a-${this.filters.hasta}.pdf`);
    } catch (err) {
      console.error('export clinical detail pdf error', err);
      this.error = 'No se pudo generar el PDF.';
    } finally {
      this.exportingPdf = false;
      this.cdr.detectChanges();
    }
  }
}