/**
 * The <i>Bitmap</i> class. TODO: Document.
 *
 * @author Jab
 */
export class Bitmap {

    public static readonly DEBUG = false;

    private bfType: number;
    private bfSize: number;
    private bfReserved1: number;
    private bfReserved2: number;
    private bfOffBits: number;
    private biSize: number;
    private biWidth: number;
    private biHeight: number;
    private biPlanes: number;
    private bitCount: number;
    private biCompression: number;
    private biSizeImage: number;
    private biXPelsPerMeter: number;
    private biYPelsPerMeter: number;
    private biClrUsed: number;
    private biClrImportant: number;
    private colorTable: any[];
    private colorTableRGB: any[];
    private pixelOffset: number;
    private stride: number;
    private pixels: Uint8Array;

    constructor(buffer: Buffer, transparent: boolean = false) {

        // File Header
        this.bfType = buffer.readUInt16LE(0);
        this.bfSize = buffer.readUInt32LE(2);
        this.bfReserved1 = buffer.readUInt16LE(6);
        this.bfReserved2 = buffer.readUInt16LE(8);
        this.bfOffBits = buffer.readUInt32LE(10);

        // Info Header
        this.biSize = buffer.readUInt32LE(14);
        this.biWidth = buffer.readUInt32LE(18);
        this.biHeight = buffer.readUInt32LE(22);
        this.biPlanes = buffer.readUInt16LE(26);
        this.bitCount = buffer.readUInt16LE(28);
        this.biCompression = buffer.readUInt32LE(30);
        this.biSizeImage = buffer.readUInt32LE(34);
        this.biXPelsPerMeter = buffer.readInt32LE(38);
        this.biYPelsPerMeter = buffer.readInt32LE(42);
        this.biClrUsed = buffer.readUInt32LE(46);
        this.biClrImportant = buffer.readUInt32LE(50);

        if(Bitmap.DEBUG) {
            console.log('this.bfType=' + this.bfType);
            console.log('this.bfSize=' + this.bfSize);
            console.log('this.bfReserved1=' + this.bfReserved1);
            console.log('this.bfReserved2=' + this.bfReserved2);
            console.log('this.bfOffBits=' + this.bfOffBits);
            console.log('this.biSize=' + this.biSize);
            console.log('this.biWidth=' + this.biWidth);
            console.log('this.biHeight=' + this.biHeight);
            console.log('this.biPlanes=' + this.biPlanes);
            console.log('this.bitCount=' + this.bitCount);
            console.log('this.biCompression=' + this.biCompression);
            console.log('this.biSizeImage=' + this.biSizeImage);
            console.log('this.biXPelsPerMeter=' + this.biXPelsPerMeter);
            console.log('this.biYPelsPerMeter=' + this.biYPelsPerMeter);
            console.log('this.biClrUsed=' + this.biClrUsed);
            console.log('this.biClrImportant=' + this.biClrImportant);
        }

        // Define our color tables/colors used
        this.colorTable = new Array(this.biClrUsed);
        this.colorTableRGB = new Array(this.biClrUsed);

        if (this.bitCount <= 8) {

            let pixelOffset = 14 + this.biSize;

            // Read in the color table
            for (let i = 0; i < this.biClrUsed; i++) {

                this.colorTable[i] = buffer.readUInt32LE(pixelOffset);
                pixelOffset += 4;

                let argb = this.colorTable[i];
                let alpha = (argb >> 24) & 0xFF;
                let red = (argb >> 16) & 0xFF;
                let green = (argb >> 8) & 0xFF;
                let blue = (argb >> 0) & 0xFF;
                this.colorTableRGB[i] = [red, green, blue, alpha];

                // Make black transparent. SS specific need, will adjust to be dynamic
                if (transparent && this.colorTable[i] == 0xff000000) {
                    this.colorTable[i] = this.colorTable[i] & 0x00000000;
                }
            }

            this.pixelOffset = pixelOffset;
        }

        this.stride = Math.floor((this.bitCount * this.biWidth + 31) / 32) * 4;
        this.pixels = new Uint8Array(buffer.subarray(this.bfOffBits), 0);
    }

    public convertToImageData(): ImageData {

        let canvas = document.createElement("canvas");
        let ctx = canvas.getContext("2d");
        let imageData = ctx.createImageData(this.biWidth, this.biHeight);

        if (this.bitCount == 24) {

            for (let y = 0; y < this.biHeight; y++) {
                for (let x = 0; x < this.biWidth; x++) {
                    let index1 = (x + this.biWidth * ((this.biHeight - 1) - y)) * 4;
                    let index2 = (x * 3 + this.stride * y);
                    imageData.data[index1] = this.pixels[index2 + 2];
                    imageData.data[index1 + 1] = this.pixels[index2 + 1];
                    imageData.data[index1 + 2] = this.pixels[index2];
                    imageData.data[index1 + 3] = 255;
                }
            }

        } else if (this.bitCount <= 8) {

            let m_image: number[] = new Array(this.biWidth * this.biHeight);

            for (let index = 0; index < this.biWidth * this.biHeight; index++) {
                m_image[index] = this.pixels[index];
            }

            for (let y = 0; y < this.biHeight; y++) {
                for (let x = 0; x < this.biWidth; x++) {

                    let dataIndex = (x + this.biWidth * ((this.biHeight - 1) - y)) * 4;
                    let rgb = m_image[x + this.stride * y];

                    imageData.data[dataIndex] = this.colorTableRGB[rgb][0];
                    imageData.data[dataIndex + 1] = this.colorTableRGB[rgb][1];
                    imageData.data[dataIndex + 2] = this.colorTableRGB[rgb][2];
                    imageData.data[dataIndex + 3] = 255;
                }
            }

        }
        return imageData;
    }

    static toBuffer(source: HTMLCanvasElement, bitCount: number) {

        let sw = source.width;
        let sh = source.height;

        let ctx = source.getContext("2d");
        let imageData = ctx.getImageData(0, 0, sw, sh);

        let buffer: Buffer;
        let headerLength = 54; /* 24-Bit header. */

        if (bitCount == 24) {
            let pixels: Buffer;
            let stride = Math.floor((24 * sw + 31) / 32) * 4;
            pixels = Buffer.alloc(sw * sh * 3);

            for (let y = 0; y < sh; y++) {
                for (let x = 0; x < sw; x++) {
                    let imgDataIndex = (x + sw * ((sh - 1) - y)) * 4;
                    let pixelIndex = (x * 3 + stride * y);
                    pixels[pixelIndex] = imageData.data[imgDataIndex + 2];
                    pixels[pixelIndex + 1] = imageData.data[imgDataIndex + 1];
                    pixels[pixelIndex + 2] = imageData.data[imgDataIndex];
                }
            }

            let length: number;
            length = headerLength + pixels.length;
            buffer = Buffer.alloc(length);
            pixels.copy(buffer, headerLength);

        } else if (bitCount == 8) {

            let colorPixelInfo = new PaletteData(source.getContext('2d').getImageData(0, 0, sw, sh));
            if (colorPixelInfo.colorAmount() > 256) {
                colorPixelInfo.compress(256);
            } else if (colorPixelInfo.colorAmount() < 256) {
                colorPixelInfo.pad(256);
            }
            let colorTable = colorPixelInfo.toColorTable();
            let colorBuffer = Buffer.alloc(colorTable.length);
            for (let index = 0; index < colorTable.length; index += 4) {
                let red = colorTable[index];
                let green = colorTable[index + 1];
                let blue = colorTable[index + 2];
                let abgr = (0 << 24) | (red << 16) | (green << 8) | blue;
                colorBuffer.writeInt32LE(abgr, index);
            }

            let colorPixels = colorPixelInfo.pixels;
            let pixelBuffer = Buffer.alloc(colorPixels.length);

            let offset = 0;
            for (let y = 0; y < sh; y++) {
                for (let x = 0; x < sw; x++) {
                    let dataIndex = (x + sw * ((sh - 1) - y));
                    pixelBuffer.writeUInt8(colorPixels[dataIndex++], offset++);
                }
            }

            let length = headerLength + colorBuffer.length + pixelBuffer.length;
            buffer = Buffer.alloc(length);
            colorBuffer.copy(buffer, headerLength);
            pixelBuffer.copy(buffer, headerLength + 1024);
        }

        // File Header
        buffer.writeUInt16LE(19778, 0); // bfType
        buffer.writeUInt32LE(buffer.length, 2); // bfSize
        buffer.writeUInt16LE(0, 6); // bfReserved1
        buffer.writeUInt16LE(0, 8); // bfReserved2
        buffer.writeUInt32LE(40, 14); // biSize

        // Info Header
        buffer.writeUInt32LE(sw, 18); // biWidth
        buffer.writeUInt32LE(sh, 22); // biHeight
        buffer.writeUInt16LE(1, 26); // biPlanes
        buffer.writeUInt16LE(bitCount, 28); // bitCount
        buffer.writeUInt32LE(0, 30); // biCompression
        buffer.writeUInt32LE(0, 38); // biXPelsPerMeter
        buffer.writeUInt32LE(0, 42); // biYPelsPerMeter

        if (bitCount == 24) {
            buffer.writeUInt32LE(54, 10); // bfOffBits
            buffer.writeUInt32LE(sw * sh * 3 /*145920*/, 34); // biSizeImage
            buffer.writeUInt32LE(0, 46); // biClrUsed
            buffer.writeUInt32LE(0, 50); // biClrImportant
        } else if (bitCount == 8) {
            // 1024 color table + 54 header.
            buffer.writeUInt32LE(1078, 10); // bfOffBits
            buffer.writeUInt32LE(sw * sh, 34); // biSizeImage
            buffer.writeUInt32LE(256, 46); // biClrUsed
            buffer.writeUInt32LE(256, 50); // biClrImportant
        }

        return buffer;
    }
}

/**
 * The <i>PaletteData</i> class. TODO: Document.
 *
 * @author Jab
 */
export class PaletteData {

    palette: PaletteColor[];
    pixels: number[];

    constructor(data: ImageData) {

        let width = data.width;
        let height = data.height;
        let pixelCount = width * height;

        this.pixels = new Array(pixelCount);
        this.palette = [];

        for (let index = 0; index < pixelCount; index++) {

            let offset = index * 4;
            let r = data.data[offset];
            let g = data.data[offset + 1];
            let b = data.data[offset + 2];

            let pixelIndex = -1;

            for (let ti = 0; ti < this.palette.length; ti++) {
                let next = this.palette[ti];
                if (r === next.r && g === next.g && b === next.b) {
                    pixelIndex = ti;
                    break;
                }
            }

            if (pixelIndex === -1) {
                pixelIndex = this.palette.length;
                this.palette.push(new PaletteColor(r, g, b));
            }

            this.pixels[index] = pixelIndex;
        }
    }

    compress(toSize: number): void {
        if (toSize > this.colorAmount()) {
            throw new Error("Cannot compress palette because the size given is more than the size of the palette.");
        }

        let compressedPixels: number[] = [];
        for (let pi = 0; pi < this.pixels.length; pi++) {
            compressedPixels.push(this.pixels[pi]);
        }

        let compressedTable: PaletteColor[] = [];

        // Add basic colors to anchor to with color reduction so things don't look off
        //   that should be solid colors.
        compressedTable.push(new PaletteColor(0, 0, 0));
        compressedTable.push(new PaletteColor(255, 255, 255));
        compressedTable.push(new PaletteColor(255, 0, 0));
        compressedTable.push(new PaletteColor(0, 255, 0));
        compressedTable.push(new PaletteColor(255, 255, 0));
        compressedTable.push(new PaletteColor(0, 0, 255));
        compressedTable.push(new PaletteColor(0, 255, 255));
        compressedTable.push(new PaletteColor(255, 0, 255));

        for (let ti = 0; ti < this.palette.length; ti++) {
            compressedTable.push(this.palette[ti]);
        }

        if (compressedTable.length > toSize) {

            let dstThresh = 0;

            while (compressedTable.length > toSize) {

                dstThresh += 1;
                let newTable: PaletteColor[] = [];

                for (let ti = 0; ti < compressedTable.length; ti++) {
                    if (newTable.length == 0) {
                        newTable.push(compressedTable[ti]);
                        continue;
                    }
                    let lowestDst = -1;
                    let lowestIndex = -1;
                    for (let ti2 = 0; ti2 < newTable.length; ti2++) {
                        let dst = compressedTable[ti].getMeanDifference(newTable[ti2]);
                        if (lowestDst == -1 || lowestDst > dst) {
                            lowestDst = dst;
                            lowestIndex = ti2;
                        }
                    }
                    if (lowestDst <= dstThresh) {
                        for (let pi = 0; pi < compressedPixels.length; pi++) {
                            if (compressedPixels[pi] == ti) {
                                compressedPixels[pi] = lowestIndex;
                            }
                        }
                    } else {
                        newTable.push(compressedTable[ti]);
                    }
                }
            }
        }

    }

    pad(amount: number, color: PaletteColor = new PaletteColor(0, 0, 0)): void {

        if (color == null) {
            throw new Error("The color given is null.");
        }

        if (amount <= this.colorAmount()) {
            throw new Error("Cannot pad palette because the size given is less than the size of the palette.");
        }

        while (this.palette.length < amount * 4) {
            // Pad with the color 'black'.
            this.palette.push(color);
        }
    }

    toColorTable(): number[] {

        let size = this.colorAmount();

        let table: number[] = new Array(size * 4);

        for (let ti = 0; ti < 256; ti++) {
            let offset = ti * 4;
            table[offset] = this.palette[ti].r;
            table[offset + 1] = this.palette[ti].g;
            table[offset + 2] = this.palette[ti].b;
            table[offset + 3] = 0;
        }

        return table;
    }

    colorAmount(): number {
        return this.palette.length;
    }
}

export class PaletteColor {

    r: number;
    g: number;
    b: number;

    constructor(r: number, g: number, b: number) {
        this.r = r;
        this.g = g;
        this.b = b;
    }

    getMeanDifference(other: PaletteColor): number {
        let r = Math.abs(this.r - other.r);
        let g = Math.abs(this.g - other.g);
        let b = Math.abs(this.b - other.b);
        return r + g + b / 3.0;
    }

}