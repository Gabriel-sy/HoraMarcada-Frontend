import { describe, expect, it } from 'vitest';
import { Service } from './models/service.model';
import { groupActiveServicesByCategory } from './group-services-by-category';

function makeService(overrides: Partial<Service> = {}): Service {
  return {
    id: 'service-1',
    storeId: 'store-1',
    categoryId: 'category-1',
    categoryName: 'Cabelo',
    name: 'Corte',
    durationMinutes: 30,
    professionalIds: [],
    active: true,
    ...overrides,
  };
}

describe('groupActiveServicesByCategory', () => {
  it('sorts category names alphabetically', () => {
    const services = [
      makeService({ id: '1', categoryId: 'c-unhas', categoryName: 'Unhas', name: 'Manicure' }),
      makeService({ id: '2', categoryId: 'c-cabelo', categoryName: 'Cabelo', name: 'Corte' }),
      makeService({ id: '3', categoryId: 'c-barba', categoryName: 'Barba', name: 'Barba' }),
    ];

    const groups = groupActiveServicesByCategory(services);

    expect(groups.map((group) => group.category.name)).toEqual(['Barba', 'Cabelo', 'Unhas']);
  });

  it('sorts services alphabetically within each category', () => {
    const services = [
      makeService({ id: '1', categoryId: 'c-cabelo', categoryName: 'Cabelo', name: 'Hidratação' }),
      makeService({ id: '2', categoryId: 'c-cabelo', categoryName: 'Cabelo', name: 'Corte' }),
      makeService({ id: '3', categoryId: 'c-cabelo', categoryName: 'Cabelo', name: 'Escova' }),
    ];

    const groups = groupActiveServicesByCategory(services);

    expect(groups).toHaveLength(1);
    expect(groups[0].services.map((service) => service.name)).toEqual(['Corte', 'Escova', 'Hidratação']);
  });

  it('omits inactive services and categories with no active services', () => {
    const services = [
      makeService({ id: '1', categoryId: 'c-cabelo', categoryName: 'Cabelo', name: 'Corte', active: true }),
      makeService({ id: '2', categoryId: 'c-cabelo', categoryName: 'Cabelo', name: 'Escova', active: false }),
      makeService({ id: '3', categoryId: 'c-unhas', categoryName: 'Unhas', name: 'Manicure', active: false }),
    ];

    const groups = groupActiveServicesByCategory(services);

    expect(groups.map((group) => group.category.name)).toEqual(['Cabelo']);
    expect(groups[0].services.map((service) => service.name)).toEqual(['Corte']);
  });

  it('keeps the first category name when services in the same category disagree', () => {
    const services = [
      makeService({ id: '1', categoryId: 'c-cabelo', categoryName: 'Cabelo', name: 'Corte' }),
      makeService({ id: '2', categoryId: 'c-cabelo', categoryName: 'Cabeleireiro', name: 'Escova' }),
    ];

    const groups = groupActiveServicesByCategory(services);

    expect(groups).toHaveLength(1);
    expect(groups[0].category.name).toBe('Cabelo');
  });
});
