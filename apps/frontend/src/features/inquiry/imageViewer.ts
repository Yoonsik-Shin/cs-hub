export interface ImageNavigation {
  index: number;
  previous: string | null;
  next: string | null;
}

export function resolveImageNavigation(
  imageUrls: readonly string[],
  activeUrl: string,
): ImageNavigation {
  const index = imageUrls.indexOf(activeUrl);
  if (index < 0) {
    return { index: -1, previous: null, next: null };
  }

  return {
    index,
    previous: index > 0 ? imageUrls[index - 1] : null,
    next: index < imageUrls.length - 1 ? imageUrls[index + 1] : null,
  };
}
