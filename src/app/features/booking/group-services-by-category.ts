import { Service } from './models/service.model';

export interface ServiceCategoryGroup {
  categoryId: string;
  categoryName: string;
  services: Service[];
}

export function groupServicesByCategory(services: Service[]): ServiceCategoryGroup[] {
  const activeServices = services.filter((service) => service.active);
  const groupsByCategoryId = new Map<string, ServiceCategoryGroup>();

  for (const service of activeServices) {
    const existingGroup = groupsByCategoryId.get(service.categoryId);

    if (existingGroup) {
      existingGroup.services.push(service);
      continue;
    }

    groupsByCategoryId.set(service.categoryId, {
      categoryId: service.categoryId,
      categoryName: service.categoryName,
      services: [service],
    });
  }

  return Array.from(groupsByCategoryId.values())
    .map((group) => ({
      ...group,
      services: [...group.services].sort((left, right) => left.name.localeCompare(right.name, 'pt-BR')),
    }))
    .sort((left, right) => left.categoryName.localeCompare(right.categoryName, 'pt-BR'));
}
