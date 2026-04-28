'use client';

import { useState } from 'react';
import { storiesApi, API_BASE_URL } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Type, Image as ImageIcon, Palette } from 'lucide-react';

interface CreateStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStoryCreated?: () => void;
}

const BACKGROUND_COLORS = [
  '#000000',
  '#FF0000',
  '#00FF00',
  '#0000FF',
  '#FFFF00',
  '#FF00FF',
  '#00FFFF',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#DDA15E',
];

export default function CreateStoryDialog({
  open,
  onOpenChange,
  onStoryCreated,
}: CreateStoryDialogProps) {
  const [storyType, setStoryType] = useState<'text' | 'media'>('text');
  const [content, setContent] = useState('');
  const [backgroundColor, setBackgroundColor] = useState('#000000');
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleMediaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreateStory = async () => {
    if (storyType === 'text' && !content.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter some text for your story',
        variant: 'destructive',
      });
      return;
    }

    if (storyType === 'media' && !mediaFile) {
      toast({
        title: 'Error',
        description: 'Please select a media file',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      let mediaUrl = null;
      let mediaType = 'text';

      // Upload media if exists
      if (mediaFile) {
        const formData = new FormData();
        formData.append('media', mediaFile);

        // Using existing upload endpoint (you may need to create a dedicated one)
        const uploadResponse = await fetch(`${API_BASE_URL}/posts/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: formData,
        });

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload media');
        }

        const uploadData = await uploadResponse.json();
        mediaUrl = uploadData.data.mediaUrl;
        mediaType = mediaFile.type.startsWith('image/') ? 'image' : 'video';
      }

      const response = await storiesApi.createStory({
        content: storyType === 'text' ? content : null,
        mediaUrl,
        mediaType,
        backgroundColor: storyType === 'text' ? backgroundColor : '#000000',
      });

      if (response.success) {
        toast({
          title: 'Success',
          description: 'Story created successfully',
        });
        onOpenChange(false);
        resetForm();
        onStoryCreated?.();
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create story',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setContent('');
    setBackgroundColor('#000000');
    setMediaFile(null);
    setMediaPreview(null);
    setStoryType('text');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
          <DialogDescription>
            Share a moment that lasts 24 hours
          </DialogDescription>
        </DialogHeader>

        <Tabs value={storyType} onValueChange={(v) => setStoryType(v as 'text' | 'media')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">
              <Type className="h-4 w-4 mr-2" />
              Text
            </TabsTrigger>
            <TabsTrigger value="media">
              <ImageIcon className="h-4 w-4 mr-2" />
              Media
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text" className="space-y-4">
            <div>
              <Label htmlFor="content">Your Message</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What's on your mind?"
                rows={6}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">
                {content.length}/500 characters
              </p>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-2">
                <Palette className="h-4 w-4" />
                Background Color
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {BACKGROUND_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setBackgroundColor(color)}
                    className={`h-10 w-10 rounded-lg transition-transform ${
                      backgroundColor === color ? 'ring-2 ring-offset-2 ring-primary scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Preview */}
            <div
              className="h-48 rounded-lg flex items-center justify-center p-4"
              style={{ backgroundColor }}
            >
              <p className="text-white text-lg text-center font-medium whitespace-pre-wrap">
                {content || 'Your text will appear here'}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="media" className="space-y-4">
            <div>
              <Label htmlFor="media">Upload Image or Video</Label>
              <input
                id="media"
                type="file"
                accept="image/*,video/*"
                onChange={handleMediaChange}
                className="w-full mt-2 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
            </div>

            {/* Preview */}
            {mediaPreview && (
              <div className="h-64 bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                {mediaFile?.type.startsWith('image/') ? (
                  <img
                    src={mediaPreview}
                    alt="Preview"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <video
                    src={mediaPreview}
                    className="max-h-full max-w-full"
                    controls
                  />
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Button onClick={handleCreateStory} disabled={loading} className="w-full">
          {loading ? 'Creating...' : 'Share Story'}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
