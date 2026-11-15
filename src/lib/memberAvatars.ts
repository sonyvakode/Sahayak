export function getMemberAvatar(nameOrId: string): string {
  const key = nameOrId.toLowerCase();
  if (key.includes('anjali') || key.includes('mem-01')) {
    return '/src/assets/images/avatar_anjali_1794754256511.jpg';
  }
  if (key.includes('lakshmi') || key.includes('mem-02')) {
    return '/src/assets/images/avatar_lakshmi_1794754255796.jpg';
  }
  if (key.includes('meena') || key.includes('mem-03')) {
    return '/src/assets/images/avatar_meena_1794754255883.jpg';
  }
  if (key.includes('rani') || key.includes('mem-04')) {
    return '/src/assets/images/avatar_rani_1794754256852.jpg';
  }
  return '/src/assets/images/avatar_anjali_1794754256511.jpg';
}
