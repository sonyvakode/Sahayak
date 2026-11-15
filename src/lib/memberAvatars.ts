import anjaliAvatar from '../assets/images/avatar_anjali_1794754256511.jpg';
import lakshmiAvatar from '../assets/images/avatar_lakshmi_1794754255796.jpg';
import meenaAvatar from '../assets/images/avatar_meena_1794754255883.jpg';
import raniAvatar from '../assets/images/avatar_rani_1794754256852.jpg';

export function getMemberAvatar(nameOrId: string): string {
  const key = nameOrId.toLowerCase();
  if (key.includes('anjali') || key.includes('mem-01')) {
    return anjaliAvatar;
  }
  if (key.includes('lakshmi') || key.includes('mem-02')) {
    return lakshmiAvatar;
  }
  if (key.includes('meena') || key.includes('mem-03')) {
    return meenaAvatar;
  }
  if (key.includes('rani') || key.includes('mem-04')) {
    return raniAvatar;
  }
  return anjaliAvatar;
}
