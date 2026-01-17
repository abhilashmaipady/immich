import { getFilenameExtension } from '$lib/utils/asset-utils';
import { getExifCount } from '$lib/utils/exif-utils';
import type { AssetResponseDto } from '@immich/sdk';
import { sortBy } from 'lodash-es';

/**
 * Suggests the best duplicate asset to keep from a list of duplicates.
 *
 * The best asset is determined by the following criteria:
 *  - Is a favorite
 *  - Is asset from external library and compare the fize size with bias, if bias is 90% then prefer the external library image if the external image size is > 95% of size of the image stored in immich
 *  - Favour raw or heic or jpg ( better format and have more data), raw >> heic >> jpg
 *  - Largest resolution (width * height)
 *  - Largest image file size in bytes (take in account that same size but different format is not equal )
 *  - Largest count of exif data
 *  - If asset name same then prefer the original asset rather than its copy eq if Image.jpg, Image (1).jpg, then prefere the Image.jpg 
 * 
 * @param assets List of duplicate assets
 * @returns The best asset to keep
 */
export const sortDuplicates = (assets: AssetResponseDto[]): AssetResponseDto[] => {
  const maxFileSize = Math.max(...assets.map((asset) => asset.exifInfo?.fileSizeInByte ?? 0));

  return sortBy(assets, [
    (asset) => asset.isFavorite,
    (asset) => !!asset.libraryId && (asset.exifInfo?.fileSizeInByte ?? 0) >= maxFileSize * 0.90,
    getFormatScore,
    (asset) => (asset.width ?? 0) * (asset.height ?? 0),
    (asset) => asset.exifInfo?.fileSizeInByte ?? 0,
    getExifCount,
    (asset) => !/\(\d+\)$/.test(asset.originalFileName),
  ]);
};

export const suggestDuplicate = (assets: AssetResponseDto[]): AssetResponseDto | undefined => {
  const sortedAssets = sortDuplicates(assets);
  return sortedAssets.pop();
};

const getFormatScore = (asset: AssetResponseDto) => {
  const extension = getFilenameExtension(asset.originalPath);
  if (['arw', 'cr2', 'cr3', 'dng', 'nef', 'orf', 'raf', 'rw2', 'srw'].includes(extension)) {
    return 3;
  }
  if (['heic', 'heif', 'avif'].includes(extension)) {
    return 2;
  }
  if (['jpg', 'jpeg'].includes(extension)) {
    return 1;
  }
  return 0;
};
