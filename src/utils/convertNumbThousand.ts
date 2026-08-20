import { formatNumber } from '@/lib/format'

const convertNumbThousand = (x?: number): string => {
  if (!x) {
    return "0";
  }
  return formatNumber(x);
};
export default convertNumbThousand;
