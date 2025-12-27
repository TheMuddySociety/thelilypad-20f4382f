import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Smile, Sticker, Loader2, ShoppingBag, Clock } from 'lucide-react';
import { usePurchasedStickers } from '@/hooks/usePurchasedStickers';
import { Link } from 'react-router-dom';

interface SelectedSticker {
  url: string;
  name: string;
  itemId: string;
}

interface StickerEmojiPickerProps {
  userId: string | null;
  onSelect: (sticker: SelectedSticker) => void;
}

export const StickerEmojiPicker = ({ userId, onSelect }: StickerEmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const { stickerPacks, emojiPacks, recentStickers, isLoading, addToRecent } = usePurchasedStickers(userId);

  const handleSelect = (sticker: SelectedSticker) => {
    addToRecent(sticker);
    onSelect(sticker);
    setOpen(false);
  };

  const hasStickers = stickerPacks.length > 0;
  const hasEmojis = emojiPacks.length > 0;
  const hasRecent = recentStickers.length > 0;
  const hasPacks = hasStickers || hasEmojis;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-9 w-9 flex-shrink-0"
          disabled={!userId}
        >
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-72 p-0" 
        side="top" 
        align="start"
        sideOffset={8}
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !hasPacks ? (
          <div className="p-4 text-center">
            <Sticker className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-3">
              No sticker packs yet
            </p>
            <Button asChild size="sm" variant="outline">
              <Link to="/shop" onClick={() => setOpen(false)}>
                <ShoppingBag className="h-4 w-4 mr-2" />
                Browse Shop
              </Link>
            </Button>
          </div>
        ) : (
          <Tabs defaultValue={hasStickers ? "stickers" : "emojis"} className="w-full">
            <TabsList className="w-full grid grid-cols-2 rounded-none border-b bg-transparent h-10">
              <TabsTrigger 
                value="stickers" 
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                disabled={!hasStickers}
              >
                <Sticker className="h-4 w-4 mr-1.5" />
                Stickers
              </TabsTrigger>
              <TabsTrigger 
                value="emojis"
                className="rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary"
                disabled={!hasEmojis}
              >
                <Smile className="h-4 w-4 mr-1.5" />
                Emojis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="stickers" className="mt-0">
              <ScrollArea className="h-64">
                <div className="p-2 space-y-3">
                  {hasRecent && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground px-1 mb-1.5 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Recently Used
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {recentStickers.map((sticker, index) => (
                          <button
                            key={`recent-${index}`}
                            onClick={() => handleSelect({
                              url: sticker.url,
                              name: sticker.name,
                              itemId: sticker.itemId,
                            })}
                            className="aspect-square rounded-md hover:bg-accent p-1 transition-colors"
                            title={sticker.name}
                          >
                            <img
                              src={sticker.url}
                              alt={sticker.name}
                              className="w-full h-full object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {stickerPacks.map((pack) => (
                    <div key={pack.itemId}>
                      <p className="text-xs font-medium text-muted-foreground px-1 mb-1.5">
                        {pack.name}
                      </p>
                      <div className="grid grid-cols-4 gap-1">
                        {pack.contents.map((sticker) => (
                          <button
                            key={sticker.id}
                            onClick={() => handleSelect({
                              url: sticker.file_url,
                              name: sticker.name,
                              itemId: pack.itemId,
                            })}
                            className="aspect-square rounded-md hover:bg-accent p-1 transition-colors"
                            title={sticker.name}
                          >
                            <img
                              src={sticker.file_url}
                              alt={sticker.name}
                              className="w-full h-full object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="emojis" className="mt-0">
              <ScrollArea className="h-64">
                <div className="p-2 space-y-3">
                  {emojiPacks.map((pack) => (
                    <div key={pack.itemId}>
                      <p className="text-xs font-medium text-muted-foreground px-1 mb-1.5">
                        {pack.name}
                      </p>
                      <div className="grid grid-cols-6 gap-1">
                        {pack.contents.map((emoji) => (
                          <button
                            key={emoji.id}
                            onClick={() => handleSelect({
                              url: emoji.file_url,
                              name: emoji.name,
                              itemId: pack.itemId,
                            })}
                            className="aspect-square rounded-md hover:bg-accent p-0.5 transition-colors"
                            title={emoji.name}
                          >
                            <img
                              src={emoji.file_url}
                              alt={emoji.name}
                              className="w-full h-full object-contain"
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default StickerEmojiPicker;
