import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs/operators';
import { Api } from '../../core/services/api';

interface Client {
  id_externo: string;
  nombre: string;
  direccion: string | null;
  creado_en: string | null;
}

interface ClientCreate {
  id_externo: string;
  nombre: string;
  direccion: string | null;
}

interface ClientUpdate {
  nombre?: string;
  direccion?: string | null;
}

@Component({
  selector: 'app-clients',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './clients.html',
  styleUrl: './clients.scss'
})
export class Clients implements OnInit {
  private api = inject(Api);
  private cdr = inject(ChangeDetectorRef);

  clients: Client[] = [];

  loading = false;
  saving = false;
  error = '';
  success = '';
  q = '';

  editingIdExterno: string | null = null;

  form: ClientCreate = {
    id_externo: '',
    nombre: '',
    direccion: ''
  };

  ngOnInit(): void {
    this.loadClients();
  }

  loadClients(): void {
    const search = this.q.trim();

    this.loading = true;
    this.error = '';

    this.api.get<Client[]>('/clients', {
      q: search ? search : undefined
    })
    .pipe(finalize(() => {
      this.loading = false;
      this.cdr.detectChanges();
    }))
    .subscribe({
      next: (data) => {
        this.clients = data;
      },
      error: (err) => {
        console.error('load clients error', err);
        this.error = err?.error?.detail || 'No se pudieron cargar los clientes.';
      }
    });
  }

  search(): void {
    this.loadClients();
  }

  clearFilters(): void {
    this.q = '';
    this.loadClients();
  }

  isEditing(): boolean {
    return !!this.editingIdExterno;
  }

  startEdit(client: Client): void {
    this.error = '';
    this.success = '';
    this.editingIdExterno = client.id_externo;

    this.form = {
      id_externo: client.id_externo,
      nombre: client.nombre,
      direccion: client.direccion || ''
    };
  }

  cancelEdit(): void {
    this.editingIdExterno = null;
    this.resetForm();
  }

  save(): void {
    this.error = '';
    this.success = '';

    const idExterno = this.form.id_externo.trim();
    const nombre = this.form.nombre.trim();
    const direccion = this.form.direccion?.trim() || null;

    if (!idExterno) {
      this.error = 'El id externo es obligatorio.';
      return;
    }

    if (!nombre) {
      this.error = 'El nombre es obligatorio.';
      return;
    }

    this.saving = true;

    if (this.isEditing()) {
      const payload: ClientUpdate = {
        nombre,
        direccion
      };

      this.api.patch(`/clients/${this.editingIdExterno}`, payload)
        .pipe(finalize(() => {
          this.saving = false;
          this.cdr.detectChanges();
        }))
        .subscribe({
          next: () => {
            this.success = 'Cliente actualizado correctamente.';
            this.editingIdExterno = null;
            this.resetForm();
            this.loadClients();
          },
          error: (err) => {
            console.error('update client error', err);
            this.error = err?.error?.detail || 'No se pudo actualizar el cliente.';
          }
        });

      return;
    }

    const payload: ClientCreate = {
      id_externo: idExterno,
      nombre,
      direccion
    };

    this.api.post('/clients', payload)
      .pipe(finalize(() => {
        this.saving = false;
        this.cdr.detectChanges();
      }))
      .subscribe({
        next: () => {
          this.success = 'Cliente creado correctamente.';
          this.resetForm();
          this.loadClients();
        },
        error: (err) => {
          console.error('create client error', err);
          this.error = err?.error?.detail || 'No se pudo crear el cliente.';
        }
      });
  }

  resetForm(): void {
    this.form = {
      id_externo: '',
      nombre: '',
      direccion: ''
    };
  }
}