import { useState, useRef, useCallback } from "react";
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Crop as CropIcon, RotateCcw, RotateCw, ZoomIn, ZoomOut } from "lucide-react";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  onCropComplete: (croppedBlob: Blob) => void;
  aspect?: number;
}

function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: "%",
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

export const ImageCropModal = ({
  isOpen,
  onClose,
  imageSrc,
  onCropComplete,
  aspect = 1,
}: ImageCropModalProps) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const imgRef = useRef<HTMLImageElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(centerAspectCrop(width, height, aspect));
  }, [aspect]);

  const getCroppedImg = async (): Promise<Blob | null> => {
    const image = imgRef.current;
    if (!image || !completedCrop) return null;

    const canvas = document.createElement("canvas");
    const outputWidth = aspect >= 1 ? 800 : 400;
    const outputHeight = aspect >= 1 ? Math.round(800 / aspect) : 400;
    canvas.width = outputWidth;
    canvas.height = outputHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.imageSmoothingQuality = "high";

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Create an offscreen canvas for the rotated image
    const rotatedCanvas = document.createElement("canvas");
    const rotatedCtx = rotatedCanvas.getContext("2d");
    if (!rotatedCtx) return null;

    // Handle rotation - swap dimensions for 90/270 degrees
    const radians = (rotation * Math.PI) / 180;
    const isSwapped = rotation === 90 || rotation === 270;
    
    if (isSwapped) {
      rotatedCanvas.width = image.naturalHeight;
      rotatedCanvas.height = image.naturalWidth;
    } else {
      rotatedCanvas.width = image.naturalWidth;
      rotatedCanvas.height = image.naturalHeight;
    }

    rotatedCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
    rotatedCtx.rotate(radians);
    rotatedCtx.drawImage(
      image,
      -image.naturalWidth / 2,
      -image.naturalHeight / 2
    );

    // Calculate crop coordinates
    const cropX = completedCrop.x * scaleX / scale;
    const cropY = completedCrop.y * scaleY / scale;
    const cropWidth = completedCrop.width * scaleX / scale;
    const cropHeight = completedCrop.height * scaleY / scale;

    ctx.drawImage(
      rotatedCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    return new Promise((resolve) => {
      canvas.toBlob(
        (blob) => resolve(blob),
        "image/jpeg",
        0.9
      );
    });
  };

  const handleCropConfirm = async () => {
    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg();
      if (croppedBlob) {
        onCropComplete(croppedBlob);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(centerAspectCrop(width, height, aspect));
    }
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.1, 0.5));
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CropIcon className="h-5 w-5 text-primary" />
            {aspect === 1 ? 'Crop Your Avatar' : 'Crop Your Banner'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Crop Area */}
          <div className="flex justify-center overflow-hidden rounded-lg bg-muted/30 p-2">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(c) => setCompletedCrop(c)}
              aspect={aspect}
              circularCrop={aspect === 1}
              className="max-h-[300px]"
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="Crop preview"
                onLoad={onImageLoad}
                style={{ 
                  transform: `scale(${scale}) rotate(${rotation}deg)`,
                  transformOrigin: 'center'
                }}
                className="max-h-[300px] w-auto transition-transform"
              />
            </ReactCrop>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            {/* Zoom Controls */}
            <div className="flex items-center gap-3 px-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className="h-8 w-8 shrink-0"
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Slider
                value={[scale]}
                onValueChange={([value]) => setScale(value)}
                min={0.5}
                max={3}
                step={0.1}
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className="h-8 w-8 shrink-0"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground w-12 text-right">
                {Math.round(scale * 100)}%
              </span>
            </div>

            {/* Rotation Controls */}
            <div className="flex items-center justify-center gap-3 px-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRotateLeft}
                className="gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                Rotate Left
              </Button>
              <span className="text-sm text-muted-foreground min-w-[50px] text-center">
                {rotation}°
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRotateRight}
                className="gap-2"
              >
                Rotate Right
                <RotateCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleCropConfirm}
            disabled={isProcessing || !completedCrop}
            className="gap-2"
          >
            <CropIcon className="h-4 w-4" />
            {isProcessing ? "Processing..." : "Apply Crop"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};