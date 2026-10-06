import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatBytes',
  standalone: true
})
export class FormatBytesPipe implements PipeTransform {
  transform(bytes: number | null | undefined, decimals: number = 1): string {
    if (bytes === null || bytes === undefined || isNaN(bytes) || bytes === 0) {
      return '0 B';
    }

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const safeIndex = Math.min(i, sizes.length - 1);

    return `${parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(dm))} ${sizes[safeIndex]}`;
  }
}
