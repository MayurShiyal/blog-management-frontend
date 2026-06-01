import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../../common/services/api';
import {
  CategoryResponse,
  PagedCategoryResponse,
  CreateCategoryRequest,
  UpdateCategoryRequest,
} from '../models/category.models';

@Injectable({ providedIn: 'root' })
export class CategoryService {
  private readonly api = inject(ApiService);
  private readonly base = '/api/categories';

  getAll(
    pageNumber = 1,
    pageSize = 10,
    search?: string,
    isActive?: boolean | null,
  ): Observable<PagedCategoryResponse> {
    let path = `${this.base}?pageNumber=${pageNumber}&pageSize=${pageSize}`;
    if (search && search.trim()) {
      path += `&search=${encodeURIComponent(search.trim())}`;
    }
    if (isActive !== undefined && isActive !== null) {
      path += `&IsActive=${isActive}`;
    }
    return this.api.get<PagedCategoryResponse>(path);
  }

  getActive(): Observable<CategoryResponse> {
    return this.api.get<CategoryResponse>(`${this.base}/active`);
  }
  
  // FIXED: id type changed from number to string
  getById(id: string): Observable<CategoryResponse> {
    return this.api.get<CategoryResponse>(`${this.base}/${id}`);
  }

  create(payload: CreateCategoryRequest): Observable<CategoryResponse> {
    return this.api.post<CategoryResponse>(this.base, payload);
  }

  // FIXED: id type changed from number to string
  update(id: string, payload: UpdateCategoryRequest): Observable<CategoryResponse> {
    return this.api.put<CategoryResponse>(`${this.base}/${id}`, payload);
  }

  // FIXED: id type changed from number to string
  delete(id: string): Observable<CategoryResponse> {
    return this.api.delete<CategoryResponse>(`${this.base}/${id}`);
  }
}