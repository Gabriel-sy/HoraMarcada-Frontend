import { Category } from './models/category.model';
import { Service } from './models/service.model';
import { compareByNamePtBr } from '../../../shared/utils/compare-by-name-pt-br';

export interface ServiceCategoryGroup {
  category: Category;
  services: Service[];
}

export function groupActiveServicesByCategory(services: Service[]): ServiceCategoryGroup[] {
  const activeServices = services.filter((service) => service.active);
  const groupsByCategoryId = new Map<string, ServiceCategoryGroup>();

  for (const service of activeServices) {
    const existingGroup = groupsByCategoryId.get(service.categoryId);

    if (existingGroup) {
      existingGroup.services.push(service);
      continue;
    }

    groupsByCategoryId.set(service.categoryId, {
      category: {
        id: service.categoryId,
        storeId: service.storeId,
        name: service.categoryName,
      },
      services: [service],
    });
  }

  return Array.from(groupsByCategoryId.values())
    .map((group) => ({
      ...group,
      services: [...group.services].sort((a, b) => compareByNamePtBr(a.name, b.name)),
    }))
    .sort((a, b) => compareByNamePtBr(a.category.name, b.category.name));
}
