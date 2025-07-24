import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout/Layout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/Tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/Dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/AlertDialog';
import Separator from '../components/ui/Separator';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Label from '../components/ui/Label';
import UpcomingStreams from '../components/Dashboard/UpcomingStreams';
import RecentStreams from '../components/Dashboard/RecentStreams';
import { format } from 'date-fns';
import { useLivestreamStore } from '../stores';

interface StreamCardProps {
  id: string;
  title: string;
  description: string;
  date: Date;
  views?: number;
  thumbnail?: string;
  isPast?: boolean;
  onEdit?: (id: string) => void;
  onCancel?: (id: string) => void;
  platform?: string;
}

const StreamCard = ({ 
  id, 
  title, 
  description, 
  date, 
  views, 
  thumbnail, 
  isPast = false,
  onEdit,
  onCancel,
  platform
}: StreamCardProps) => {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-video bg-gray-100 dark:bg-chocolate-700">
        {thumbnail ? (
          <img 
            src={thumbnail} 
            alt={title}
            className="object-cover w-full h-full"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="w-16 h-16 text-gray-400 dark:text-chocolate-300">📺</div>
          </div>
        )}
        {isPast && (
          <div className="absolute top-2 right-2 bg-white/80 dark:bg-chocolate-800/80 px-2 py-1 rounded text-xs font-medium">
            {views} views
          </div>
        )}
      </div>
      <CardHeader className="p-4">
        <CardTitle className="text-lg">{title}</CardTitle>
        <CardDescription className="text-sm text-gray-600 dark:text-chocolate-200">
          {date.toLocaleDateString('en-US', { 
            month: 'long', 
            day: 'numeric', 
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })}
          {platform && (
            <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-chocolate-700 rounded-full text-xs">
              {platform}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-sm line-clamp-2">{description}</p>
      </CardContent>
      <CardFooter className="p-4 pt-0 flex justify-end gap-2">
        {!isPast && onEdit && onCancel && (
          <>
            <Button 
              onClick={() => onEdit(id)}
              variant="outline" 
              size="sm"
            >
              <span className="mr-1">✏️</span> Edit
            </Button>
            <Button 
              onClick={() => onCancel(id)}
              variant="outline" 
              size="sm"
              className="text-red-600 hover:text-red-700"
            >
              <span className="mr-1">🗑️</span> Cancel
            </Button>
          </>
        )}
      </CardFooter>
    </Card>
  );
};

interface EditStreamFormValues {
  title: string;
  started_at: string;
  platform: string;
  description: string;
}

const Streams: React.FC = () => {
  const { scheduledStreams, fetchScheduledStreams } = useLivestreamStore();
  const [activeTab, setActiveTab] = useState<string>("streams");
  const [upcomingStreams, setUpcomingStreams] = useState<StreamCardProps[]>([]);
  const [pastStreams, setPastStreams] = useState<StreamCardProps[]>([]);

  // Fetch scheduled streams on component mount
  useEffect(() => {
    fetchScheduledStreams();
  }, [fetchScheduledStreams]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Stream editing states
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [currentStreamId, setCurrentStreamId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditStreamFormValues>({
    title: "",
    started_at: "",
    platform: "",
    description: "",
  });

  const handleEditStream = (id: string) => {
    setCurrentStreamId(id);
    setIsEditDialogOpen(true);
  };

  const handleCancelStreamPrompt = (id: string) => {
    setCurrentStreamId(id);
    setIsCancelDialogOpen(true);
  };

  const handleSaveEdit = (values: EditStreamFormValues) => {
    console.log('Saving stream edit:', values);
    setIsEditDialogOpen(false);
  };

  const handleCancelStream = () => {
    console.log('Canceling stream:', currentStreamId);
    setIsCancelDialogOpen(false);
  };

  const availablePlatforms = ["YouTube", "Zoom", "Facebook", "Instagram", "TikTok", "Custom"];

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">Streams</h1>
          <p className="text-gray-600 dark:text-chocolate-200">Manage and view your livestream schedule</p>
        </div>
        <Separator className="my-6" />
        
        <Tabs defaultValue={activeTab} className="w-full">
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="streams">All Streams</TabsTrigger>
              <TabsTrigger value="recurring">Recurring Series</TabsTrigger>
            </TabsList>
            <Button 
              variant="default" 
              className="bg-chocolate-600 text-white hover:bg-chocolate-700"
            >
              Go Live Now
            </Button>
          </div>

          <TabsContent value="streams" className="mt-0 space-y-6">
            {/* Upcoming Streams Card */}
            <UpcomingStreams />
            
            {/* Recent Streams Card */}
            <RecentStreams />
          </TabsContent>

          <TabsContent value="recurring" className="mt-0 space-y-6">
            {/* Recurring Streams Card */}
            <div className="bg-white dark:bg-chocolate-800 rounded-lg shadow-md p-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recurring Stream Series</h3>
                <p className="text-sm text-gray-600 dark:text-chocolate-200">Your scheduled recurring streams</p>
              </div>
              
              <div className="space-y-4">
                {scheduledStreams
                  .filter(stream => stream.title.includes('Episode'))
                  .reduce((series: any[], stream) => {
                    const baseTitle = stream.title.replace(/ - Episode \d+$/, '');
                    const existingSeries = series.find(s => s.baseTitle === baseTitle);
                    
                    if (existingSeries) {
                      existingSeries.episodes.push(stream);
                    } else {
                      series.push({
                        baseTitle,
                        episodes: [stream],
                        nextEpisode: stream
                      });
                    }
                    
                    return series;
                  }, [])
                  .map((series, index) => (
                    <div key={index} className="border border-gray-200 dark:border-chocolate-600 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">{series.baseTitle}</h4>
                          <p className="text-sm text-gray-600 dark:text-chocolate-200">
                            {series.episodes.length} episodes scheduled
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Manage Series
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-chocolate-200">Next episode:</span>
                          <span className="text-gray-900 dark:text-white">
                            {format(new Date(series.nextEpisode.start_time), "MMM d, yyyy 'at' h:mm a")}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600 dark:text-chocolate-200">Platform:</span>
                          <span className="text-gray-900 dark:text-white">{series.nextEpisode.platform}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                
                {scheduledStreams.filter(stream => stream.title.includes('Episode')).length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-chocolate-200">No recurring stream series found</p>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Stream Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Stream</DialogTitle>
              <DialogDescription>
                Update the details of your scheduled stream
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="edit-platform">Platform</Label>
                <select
                  id="edit-platform"
                  value={editForm.platform}
                  onChange={(e) => setEditForm({ ...editForm, platform: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-white dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select platform</option>
                  {availablePlatforms.map(platform => (
                    <option key={platform} value={platform}>{platform}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <textarea
                  id="edit-description"
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="flex min-h-[80px] w-full rounded-md border border-gray-300 dark:border-chocolate-600 bg-white dark:bg-chocolate-700 px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => handleSaveEdit(editForm)}>
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Cancel Stream Dialog */}
        <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Stream</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this stream? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep Stream</AlertDialogCancel>
              <AlertDialogAction onClick={handleCancelStream} className="bg-red-600 hover:bg-red-700">
                Cancel Stream
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
};

export default Streams; 