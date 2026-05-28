export interface UserRoleOption {
  label: string;
  value: number;
}

export const USER_ROLES: UserRoleOption[] = [
  { label: 'Author', value: 2 },
  { label: 'Visitor', value: 3 },
];
