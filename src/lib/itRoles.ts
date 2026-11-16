import type { MessageKey } from '../i18n/types';

export const IT_ROLES = [
  'productManager',
  'projectManager',
  'businessAnalyst',
  'scrumMaster',
  'techLead',
  'frontend',
  'backend',
  'fullstack',
  'mobile',
  'qa',
  'devops',
  'designer',
  'dataAnalyst',
  'sysadmin',
] as const;

export type ItRole = (typeof IT_ROLES)[number];

export const IT_ROLE_KEYS: Record<ItRole, MessageKey> = {
  productManager: 'auth.roles.productManager',
  projectManager: 'auth.roles.projectManager',
  businessAnalyst: 'auth.roles.businessAnalyst',
  scrumMaster: 'auth.roles.scrumMaster',
  techLead: 'auth.roles.techLead',
  frontend: 'auth.roles.frontend',
  backend: 'auth.roles.backend',
  fullstack: 'auth.roles.fullstack',
  mobile: 'auth.roles.mobile',
  qa: 'auth.roles.qa',
  devops: 'auth.roles.devops',
  designer: 'auth.roles.designer',
  dataAnalyst: 'auth.roles.dataAnalyst',
  sysadmin: 'auth.roles.sysadmin',
};

export function isItRole(value: string): value is ItRole {
  return (IT_ROLES as readonly string[]).includes(value);
}
