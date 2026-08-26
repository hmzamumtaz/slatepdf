declare module 'utif' {
  interface IFD {
    width: number;
    height: number;
    data: Uint8Array;
    [key: string]: any;
  }
  function decode(buffer: Uint8Array): IFD[];
  function decodeImage(buffer: Uint8Array, ifd: IFD): void;
  export { decode, decodeImage, IFD };
}
