import { Pipe, PipeTransform } from '@angular/core';
import { CategoryDto } from '../../modules/categories/models/category.models';

@Pipe({ name: 'activeCount', standalone: true })
export class ActiveCountPipe implements PipeTransform {
  transform(categories: CategoryDto[]): number {
    return (categories ?? []).filter((c) => c.isActive).length;
  }
}

@Pipe({ name: 'inactiveCount', standalone: true })
export class InactiveCountPipe implements PipeTransform {
  transform(categories: CategoryDto[]): number {
    return (categories ?? []).filter((c) => !c.isActive).length;
  }
}
