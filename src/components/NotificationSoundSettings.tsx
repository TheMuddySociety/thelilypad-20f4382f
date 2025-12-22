import { Volume2, VolumeX, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useNotificationSound, NotificationSoundType } from "@/hooks/useNotificationSound";
import { Label } from "@/components/ui/label";

const SOUND_OPTIONS: { value: NotificationSoundType; label: string }[] = [
  { value: "none", label: "None" },
  { value: "chime", label: "Chime" },
  { value: "bell", label: "Bell" },
  { value: "pop", label: "Pop" },
  { value: "alert", label: "Alert" },
];

export const NotificationSoundSettings = () => {
  const { sound, volume, setSound, setVolume, previewSound } = useNotificationSound();

  const handleSoundChange = (value: NotificationSoundType) => {
    setSound(value);
    if (value !== "none") {
      previewSound(value, volume);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
  };

  const handlePreview = () => {
    previewSound(sound, volume);
  };

  return (
    <div className="space-y-4 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Bell className="h-4 w-4" />
        Sound Settings
      </div>
      
      <div className="space-y-3">
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Notification Sound</Label>
          <div className="flex items-center gap-2">
            <Select value={sound} onValueChange={handleSoundChange}>
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOUND_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreview}
              disabled={sound === "none"}
              className="h-8 px-2"
            >
              <Volume2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">Volume</Label>
          <div className="flex items-center gap-3">
            <VolumeX className="h-4 w-4 text-muted-foreground" />
            <Slider
              value={[volume]}
              onValueChange={handleVolumeChange}
              max={1}
              step={0.1}
              className="flex-1"
              disabled={sound === "none"}
            />
            <Volume2 className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>
    </div>
  );
};
